import { useEffect, useMemo, useState } from "react";
import "./App.css";
import spotifyLogo from "./assets/spotify-logo.png";
import { classifyTrack, filterTags } from "./classification";
import { mockTracks } from "./mockTracks";
import type { LibraryResponse } from "./types";
import { API_URL } from "./config";

function App() {
  const [backendStatus, setBackendStatus] =
    useState("Checking...");

  const [library, setLibrary] =
    useState<LibraryResponse | null>(null);

  const [loadingLibrary, setLoadingLibrary] =
    useState(false);

  const [loadedCount, setLoadedCount] =
    useState(0);

  const [totalCount, setTotalCount] =
    useState(0);

  const [error, setError] =
    useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<"AND" | "OR">("AND");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((response) => response.json())
      .then((data) =>
        setBackendStatus(data.status)
      )
      .catch(() =>
        setBackendStatus("offline")
      );
  }, []);

  function loginWithSpotify() {
    window.location.href = `${API_URL}/auth/login`;
  }

  function loadLibrary() {
    setLoadingLibrary(true);
    setError(null);
    setLibrary(null);
    setLoadedCount(0);
    setTotalCount(0);
    setLibraryMessage(null);

    const eventSource = new EventSource(
      `${API_URL}/api/library/stream`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "progress") {
        setLoadedCount(data.loaded);
        setTotalCount(data.total);
      }

      if (data.type === "complete") {
        setLibrary({
          loaded: data.loaded,
          total: data.total,
          tracks: data.tracks,
          source: data.source,
          synced_at: data.synced_at,
        });

        setLoadedCount(data.loaded);
        setTotalCount(data.total);

        setLoadingLibrary(false);
        setLibraryMessage(
          data.source === "cache"
            ? "Loaded from your saved cache with no Spotify requests."
            : "Initial Spotify library downloaded and cached.",
        );
        eventSource.close();
      }

      if (data.type === "error") {
        if (data.status === 429) {
          setError(
            "Too many Spotify API calls. Please wait a while before loading your library again."
          );
        } else {
          setError(
            "Could not load your Spotify library. Please try again."
          );
        }

        setLoadingLibrary(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError(
        "Connection to library stream failed."
      );

      setLoadingLibrary(false);
      eventSource.close();
    };
  }

  function syncNewSongs() {
    setLoadingLibrary(true);
    setError(null);
    setLibraryMessage("Checking Spotify for newly liked songs...");

    const eventSource = new EventSource(
      `${API_URL}/api/library/sync/stream`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "complete") {
        setLibrary({
          loaded: data.loaded,
          total: data.total,
          tracks: data.tracks,
          source: data.source,
          synced_at: data.synced_at,
          new_tracks: data.new_tracks,
        });
        setLoadedCount(data.loaded);
        setTotalCount(data.total);
        setLoadingLibrary(false);
        setLibraryMessage(
          data.new_tracks === 1
            ? "Added 1 newly liked song to the cache."
            : `Added ${data.new_tracks} newly liked songs to the cache.`,
        );
        eventSource.close();
      }

      if (data.type === "error") {
        const retryMessage = data.retry_after
          ? ` Try again in ${data.retry_after} seconds.`
          : "";
        setError(`Could not sync new songs.${retryMessage}`);
        setLoadingLibrary(false);
        setLibraryMessage(null);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError("Connection to the library sync failed. Make sure the cache exists and Spotify is connected.");
      setLoadingLibrary(false);
      setLibraryMessage(null);
      eventSource.close();
    };
  }

  function loadDemoLibrary() {
    setError(null);
    setLoadingLibrary(false);
    setQuery("");
    setActiveTags([]);
    setSelected(new Set());
    setLibraryMessage("Loaded local demo songs; Spotify was not contacted.");
    setLoadedCount(mockTracks.length);
    setTotalCount(mockTracks.length);
    setLibrary({
      loaded: mockTracks.length,
      total: mockTracks.length,
      tracks: mockTracks,
      source: "demo",
    });
  }

  const progressPercentage =
    totalCount > 0
      ? Math.round(
          (loadedCount / totalCount) * 100
        )
      : 0;

  const classifiedTracks = useMemo(
    () => library?.tracks.map((track) => ({ ...track, ...classifyTrack(track) })) ?? [],
    [library],
  );

  const filteredTracks = useMemo(() => {
    const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return classifiedTracks.filter((track) => {
      const text = `${track.name} ${track.artists.join(" ")} ${track.album} ${track.tags.join(" ")}`.toLocaleLowerCase();
      const matchesKeywords = terms.every((term) => text.includes(term));
      const matchesTags = activeTags.length === 0 || (
        filterMode === "AND"
          ? activeTags.every((tag) => track.tags.includes(tag))
          : activeTags.some((tag) => track.tags.includes(tag))
      );
      return matchesKeywords && matchesTags;
    });
  }, [classifiedTracks, query, activeTags, filterMode]);

  function toggleTag(tag: string) {
    setActiveTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  function toggleAllTags() {
    setActiveTags((current) =>
      current.length === filterTags.length ? [] : [...filterTags],
    );
  }

  function toggleTrack(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectVisible() {
    setSelected((current) => new Set([...current, ...filteredTracks.map((track) => track.id)]));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img
            className="brand-logo"
            src={spotifyLogo}
            alt="Spotify"
          />

          <span>Classify</span>
        </div>

        <div className="backend-status">
          API{" "}
          <strong>
            {backendStatus === "ok"
              ? "Connected"
              : backendStatus}
          </strong>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-eyebrow">
            Your music, organised
          </div>

          <h1>
            Rediscover the music you already love.
          </h1>

          <p>
            Connect your Spotify library, find
            forgotten classical pieces using
            meaningful tags, and turn your results
            into playlists.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={loginWithSpotify}
            >
              Connect Spotify
            </button>

            <button
              className="secondary-button"
              onClick={loadLibrary}
              disabled={loadingLibrary}
            >
              {loadingLibrary
                ? "Loading library..."
                : "Load Library"}
            </button>

            <button
              className="secondary-button"
              onClick={syncNewSongs}
              disabled={loadingLibrary || !library || library.source === "demo"}
            >
              Sync New Songs
            </button>

          </div>

          <div className="demo-action">
            <span>No Spotify? No problem, see how it works here:</span>
            <button
              className="demo-button"
              onClick={loadDemoLibrary}
              disabled={loadingLibrary}
            >
              Load Demo Songs
            </button>
          </div>

          {loadingLibrary &&
            totalCount > 0 && (
              <div className="library-progress">
                <div className="progress-info">
                  <span>
                    Scanning your Liked Songs
                  </span>

                  <span className="progress-count">
                    {loadedCount.toLocaleString()} /{" "}
                    {totalCount.toLocaleString()}
                  </span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${progressPercentage}%`,
                    }}
                  />
                </div>

                <div className="progress-percentage">
                  {progressPercentage}% complete
                </div>
              </div>
            )}

          {error && (
            <div className="error-message">
              <span className="error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          {libraryMessage && !error && (
            <div className="library-message">{libraryMessage}</div>
          )}
        </section>

        {!library && !loadingLibrary && (
          <section className="features">
            <div className="feature-card">
              <div className="feature-icon">
                🎹
              </div>

              <h3>
                Find forgotten pieces
              </h3>

              <p>
                Search your library by
                instrument, period, composer,
                form, or other musical
                characteristics.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                🎻
              </div>

              <h3>
                Classify your library
              </h3>

              <p>
                Turn an unstructured collection
                of Liked Songs into music you
                can actually navigate.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                ♪
              </div>

              <h3>
                Build playlists
              </h3>

              <p>
                Select your favourite results
                and save them directly into a
                new Spotify playlist.
              </p>
            </div>
          </section>
        )}

        {library && (
          <section className="library">
            <div className="library-header">
              <h2>Your Liked Songs</h2>

              <div className="library-count">
                {filteredTracks.length.toLocaleString()} matches · {selected.size.toLocaleString()} selected
                {library.synced_at && (
                  <div className="sync-time">
                    Last synced {new Date(library.synced_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div className="filters">
              <input
                className="search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, artist, album, form or style…"
                aria-label="Search liked songs"
              />
              <div className="tag-filters">
                <button
                  className={`tag-button all-tags ${activeTags.length === filterTags.length ? "active" : ""}`}
                  onClick={toggleAllTags}
                >
                  All filters
                </button>
                {filterTags.map((tag) => (
                  <button key={tag} className={`tag-button ${activeTags.includes(tag) ? "active" : ""}`} onClick={() => toggleTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
              <div className="selection-actions">
                <div className="filter-mode" aria-label="Filter matching mode">
                  <span>Match</span>
                  <button className={filterMode === "AND" ? "active" : ""} onClick={() => setFilterMode("AND")}>AND</button>
                  <button className={filterMode === "OR" ? "active" : ""} onClick={() => setFilterMode("OR")}>OR</button>
                </div>
                <div className="track-actions">
                  <button onClick={selectVisible}>Select matches</button>
                  <button onClick={() => setSelected(new Set())}>Clear selection</button>
                </div>
              </div>
            </div>

            <div className="track-list">
              {filteredTracks.map(
                (track) => (
                  <div
                    className={`track-row ${selected.has(track.id) ? "selected" : ""}`}
                    key={track.id}
                    onClick={() => toggleTrack(track.id)}
                  >
                    <input type="checkbox" checked={selected.has(track.id)} onChange={() => toggleTrack(track.id)} onClick={(event) => event.stopPropagation()} aria-label={`Select ${track.name}`} />
                    <div className="track-primary">
                      <div className="track-name">{track.name}</div>
                      {track.tags.length > 0 && <div className="track-tags">{track.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                      {track.reasons.length > 0 && <div className="match-reason">{track.reasons.join(" · ")}</div>}
                    </div>

                    <div className="track-artist">
                      {track.artists.join(
                        ", "
                      )}
                    </div>

                    <div className="track-album">
                      {track.album}
                    </div>
                  </div>
                )
              )}
              {filteredTracks.length === 0 && <div className="empty-results">No songs match these filters. Try removing a tag or using fewer keywords.</div>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
