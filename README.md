# Classify | Classical Music Classification 🎻 🎵

A full-stack web application that helps listeners rediscover classical music in their Spotify Liked Songs and turn their discoveries into playlists.

I built Classify out of a frustration I regularly run into: having a classical piece stuck in my head but struggling to find it again. Classical track names can be long and difficult to remember, especially when they include work numbers, keys, movements, and performers. 

An earworm is particularly annoying when I know the piece is somewhere in my library but cannot remember its name!

Classify helps me narrow down the possibilities using what I do remember, such as the composer, period, instrument, form, or key, then turn the results into playlists I can return to. 

The project brings together a React and TypeScript interface, a Python API, Spotify integration, and deployment across Cloudflare and Render.

## Demo videos

### 1. Home page

<video controls preload="metadata" width="640" src="demo%20videos/1%20-%20home%20page.mp4"></video>

See the Classify home page, where you can connect to Spotify or choose **Load Demo Songs** to browse and filter a sample library without connecting to Spotify or making API requests.

[Watch home page](demo%20videos/1%20-%20home%20page.mp4)

### 2. Connect to Spotify

<video controls preload="metadata" width="640" src="demo%20videos/2%20-%20connect%20to%20spotify.mp4"></video>

Authorise Classify to access your Spotify Liked Songs. Explicit tracks are automatically excluded.

[Watch the Spotify connection demo](demo%20videos/2%20-%20connect%20to%20spotify.mp4)

### 3. Load the library

<video controls preload="metadata" width="640" src="demo%20videos/3%20-%20syncing%20library.mp4"></video>

Import your Spotify Liked Songs and follow the live loading progress. Classify requests up to 50 songs per batch, with one Spotify API request per batch. A library of 1,000 Liked Songs takes 20 requests to retrieve.

Import the full library once, then use **Sync New Songs** for updates. It starts with the newest Liked Songs and stops when it reaches a track already in the cache, reducing API requests.

[Watch sync the library](demo%20videos/3%20-%20syncing%20library.mp4)

### 4. Filter the library

<video controls preload="metadata" width="640" src="demo%20videos/4%20-%20filter%20demo.mp4"></video>

Classify assigns tags by matching whole words and phrases in track titles, artist names, and album names. For example, “string quartet” adds both the **Strings** and **Chamber** tags. Regular expressions (regex) pick out structured details such as “in C Minor”, “Symphony No. 5”, “Op. 67”, and “BWV 1043”. Eg. the **Minor** filter matches any track tagged with a minor key.

Keyword search checks titles, artists, albums, and assigned tags for every search term, regardless of capitalisation. When you also select tags, **AND** requires all selected tags and **OR** requires at least one.

[Watch filter the library](demo%20videos/4%20-%20filter%20demo.mp4)

### 5. Create a playlist

<video controls preload="metadata" width="640" src="demo%20videos/5%20-%20playlist%20creation.mp4"></video>

Select tracks from your results and save them as a private Spotify playlist.

[Watch create a playlist](demo%20videos/5%20-%20playlist%20creation.mp4)

### 6. Sync a newly liked song

<video controls preload="metadata" width="640" src="demo%20videos/6%20-%20sync%20new%20song.mp4"></video>

Add a newly liked song to your cached library using incremental sync, which reduces repeated Spotify API requests.

[Watch sync a newly liked song](demo%20videos/6%20-%20sync%20new%20song.mp4)

### 7. Mobile walkthrough

<video controls preload="metadata" width="640" src="demo%20videos/mobile.mp4"></video>

See how Classify adapts to smaller screens. On mobile, the tag filters expand when needed, leaving more room for the track list.

[Watch mobile walkthrough](demo%20videos/mobile.mp4)

## Live application and access

**Main URL: [classify-project.pages.dev](https://classify-project.pages.dev/)**

I use **Cloudflare Pages** to host the frontend and **Render** to host the FastAPI backend.

**Access is limited to approved accounts. Please [message me on LinkedIn](https://www.linkedin.com/in/anna-burt-b70a2020a/) to request access.**

### Spotify API limitations

Classify uses the Spotify Web API in development mode, which allows a maximum of **5 authorised users**. **2 users are currently added**, leaving 3 available places. Accounts must be added before they can use the Spotify integration, so access is arranged individually. See [Spotify's development-mode limits](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

Spotify's [Developer Policy](https://developer.spotify.com/policy) prohibits feeding Spotify Content into machine learning or AI models, including LLMs, as well as using it for training. This constraint shaped Classify's implementation: classification is limited to word matching and regular expressions over track metadata. For example, regex identifies major/minor keys from text such as "in C Minor". Results depend on the wording of the metadata, so missing or differently formatted information can lead to missed matches.

Spotify also applies API request quotas and rate limits. Library caching and incremental sync reduce repeated requests, but loading or syncing may still require waiting when a limit is reached.

**Try "Load Demo Songs" to explore the app without connecting Spotify.** This option loads a local sample library for browsing, classification, and filtering without making Spotify API requests. Creating a Spotify playlist requires an authorised Spotify connection.

### Current limitations

**Classify searches Liked Songs only.** It does not currently import tracks from existing playlists. If you organise your music in playlists without also liking those tracks, they will not appear in Classify, so the app may return an incomplete or empty library. It works best for listeners who consistently save their music to Liked Songs.

Classification uses word matching and regex, including patterns for musical keys, opus numbers, and catalogue numbers. Its accuracy depends on the information available in Spotify's track metadata.

Word matching can also produce false positives. For example, tracks from Queen's *A Night at the Opera* album receive the **Opera** tag because the album title contains that word, even though it does not describe their musical genre.

I automatically exclude tracks marked as explicit by Spotify to help reduce unwanted results in the classical-music selection. This is a coarse filter: it does not resolve ambiguous word matches such as the Queen example, and it can also exclude otherwise relevant tracks.

## Architecture and deployment

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Library browsing, classification, filtering, and playlist selection |
| Frontend hosting | Cloudflare Pages | Hosts the deployed web interface at the main URL above |
| Backend | Python, FastAPI, HTTPX | Spotify OAuth, token refresh, library retrieval, caching, and playlist creation |
| Backend hosting | Render | Runs the API used by the Cloudflare-hosted frontend |
| External integration | Spotify Web API | Account connection, saved tracks, and playlists |

The browser loads the frontend from Cloudflare Pages and communicates with the FastAPI service on Render. The backend handles Spotify credentials and API requests, while the frontend classifies and filters the returned track metadata.

## Engineering highlights

- **Cloud deployment:** separate frontend and backend deployments, with an environment-configured API URL and allowed frontend origins.
- **OAuth integration:** backend authorization-code exchange and access-token refresh, keeping the Spotify client secret out of the frontend.
- **Streaming feedback:** Server-Sent Events deliver library-loading progress to the React interface while the backend fetches paginated results.
- **API efficiency:** a local JSON cache avoids downloading the library on every visit; incremental sync retrieves newly liked tracks.
- **Playlist creation:** selected tracks are sent to Spotify in batches, with feedback for API failures and partially completed operations.
- **Explainable classification:** readable rules map track metadata to musical categories, making the classification logic straightforward to inspect and extend.

## Explore the code

- [Frontend application](frontend/src/App.tsx): library loading, search, selection, and playlist creation flows.
- [Classification logic](frontend/src/classification.ts): metadata matching and musical tags.
- [Spotify authentication](backend/app/auth.py): OAuth callback and token refresh.
- [Spotify API integration](backend/app/spotify.py): pagination, streaming, caching, sync, and playlists.
- [Backend configuration](backend/app/main.py): API setup, CORS, and health endpoint.
