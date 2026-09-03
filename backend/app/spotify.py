import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator

from app.auth import get_valid_access_token

router = APIRouter(prefix="/api", tags=["spotify"])

DEFAULT_CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "library_cache.json"
CACHE_PATH = Path(os.getenv("LIBRARY_CACHE_PATH", str(DEFAULT_CACHE_PATH)))
SPOTIFY_TRACKS_URL = "https://api.spotify.com/v1/me/tracks"
PAGE_SIZE = 50
PLAYLIST_BATCH_SIZE = 100


class PlaylistRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    uris: list[str] = Field(min_length=1)

    @validator("name")
    def validate_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Playlist name cannot be blank")
        return value

    @validator("uris")
    def validate_uris(cls, value):
        if any(not uri.startswith("spotify:track:") for uri in value):
            raise ValueError("Every URI must be a Spotify track URI")
        return list(dict.fromkeys(value))


def read_cache():
    if not CACHE_PATH.exists():
        return None
    try:
        with CACHE_PATH.open("r", encoding="utf-8") as cache_file:
            cache = json.load(cache_file)
    except (OSError, json.JSONDecodeError):
        return None
    tracks = cache.get("tracks")
    if not isinstance(tracks, list):
        return None
    if any(track.get("explicit") is not False for track in tracks):
        return None
    return cache


def write_cache(tracks):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    synced_at = datetime.now(timezone.utc).isoformat()
    cache = {
        "synced_at": synced_at,
        "total": len(tracks),
        "tracks": tracks,
    }
    temporary_path = CACHE_PATH.with_suffix(".tmp")
    with temporary_path.open("w", encoding="utf-8") as cache_file:
        json.dump(cache, cache_file, ensure_ascii=False, indent=2)
        cache_file.flush()
        os.fsync(cache_file.fileno())
    os.replace(temporary_path, CACHE_PATH)
    return cache


def serialize_item(item):
    track = item.get("track")
    if not track or not track.get("id"):
        return None
    if track.get("explicit") is True:
        return None
    return {
        "id": track["id"],
        "name": track["name"],
        "artists": [artist["name"] for artist in track["artists"]],
        "album": track["album"]["name"],
        "uri": track["uri"],
        "added_at": item.get("added_at"),
        "explicit": False,
    }


def sse(payload):
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def request_page(client, access_token, offset):
    return await client.get(
        SPOTIFY_TRACKS_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"limit": PAGE_SIZE, "offset": offset},
    )


def spotify_error(response):
    return {
        "type": "error",
        "status": response.status_code,
        "message": response.text,
        "retry_after": response.headers.get("Retry-After"),
    }


@router.get("/me")
async def get_me():
    access_token = await get_valid_access_token()
    if not access_token:
        raise HTTPException(status_code=401, detail="Not logged into Spotify")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@router.post("/playlists", status_code=201)
async def create_playlist(payload: PlaylistRequest):
    access_token = await get_valid_access_token()
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Spotify authorization expired. Connect Spotify again.",
        )

    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        playlist_response = await client.post(
            "https://api.spotify.com/v1/me/playlists",
            headers=headers,
            json={
                "name": payload.name,
                "public": False,
                "description": "Created with Classify",
            },
        )
        if playlist_response.status_code != 201:
            raise HTTPException(
                status_code=playlist_response.status_code,
                detail=f"Spotify could not create the playlist: {playlist_response.text}",
            )

        playlist = playlist_response.json()
        for start in range(0, len(payload.uris), PLAYLIST_BATCH_SIZE):
            tracks_response = await client.post(
                f"https://api.spotify.com/v1/playlists/{playlist['id']}/items",
                headers=headers,
                json={"uris": payload.uris[start:start + PLAYLIST_BATCH_SIZE]},
            )
            if tracks_response.status_code != 201:
                raise HTTPException(
                    status_code=tracks_response.status_code,
                    detail=(
                        "The playlist was created, but Spotify could not add all tracks. "
                        + tracks_response.text
                    ),
                )

    return {
        "id": playlist["id"],
        "name": playlist["name"],
        "url": playlist.get("external_urls", {}).get("spotify"),
        "tracks_added": len(payload.uris),
    }


@router.get("/library")
def get_library():
    cache = read_cache()
    if not cache:
        raise HTTPException(status_code=404, detail="Library cache has not been created")
    return {
        "total": len(cache["tracks"]),
        "loaded": len(cache["tracks"]),
        "tracks": cache["tracks"],
        "source": "cache",
        "synced_at": cache.get("synced_at"),
    }


@router.get("/library/stream")
async def stream_library():
    cached = read_cache()

    async def event_generator():
        if cached:
            yield sse({
                "type": "complete",
                "loaded": len(cached["tracks"]),
                "total": len(cached["tracks"]),
                "tracks": cached["tracks"],
                "source": "cache",
                "synced_at": cached.get("synced_at"),
            })
            return

        access_token = await get_valid_access_token()
        if not access_token:
            yield sse({"type": "error", "status": 401, "message": "Not logged into Spotify"})
            return

        tracks = []
        offset = 0
        total = 0
        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                response = await request_page(client, access_token, offset)
                if response.status_code != 200:
                    yield sse(spotify_error(response))
                    return
                data = response.json()
                total = data["total"]
                tracks.extend(
                    track for item in data["items"]
                    if (track := serialize_item(item)) is not None
                )
                scanned = min(offset + len(data["items"]), total)
                yield sse({"type": "progress", "loaded": scanned, "total": total})
                if not data.get("next"):
                    break
                offset += PAGE_SIZE
                await asyncio.sleep(0.35)

        saved = write_cache(tracks)
        yield sse({
            "type": "complete",
            "loaded": len(tracks),
            "total": len(tracks),
            "tracks": tracks,
            "source": "spotify",
            "synced_at": saved["synced_at"],
        })

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/library/sync/stream")
async def sync_library():
    cached = read_cache()
    access_token = await get_valid_access_token()
    if not cached:
        raise HTTPException(status_code=409, detail="Load the full library before syncing")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not logged into Spotify")

    async def event_generator():
        cached_tracks = cached["tracks"]
        cached_ids = {track["id"] for track in cached_tracks}
        new_tracks = []
        offset = 0
        reached_cache = False

        async with httpx.AsyncClient(timeout=30) as client:
            while not reached_cache:
                response = await request_page(client, access_token, offset)
                if response.status_code != 200:
                    yield sse(spotify_error(response))
                    return
                data = response.json()
                for item in data["items"]:
                    track = serialize_item(item)
                    if track is None:
                        continue
                    if track["id"] in cached_ids:
                        reached_cache = True
                        break
                    new_tracks.append(track)

                yield sse({
                    "type": "progress",
                    "loaded": len(new_tracks),
                    "total": len(new_tracks),
                    "syncing": True,
                })
                if reached_cache or not data.get("next"):
                    break
                offset += PAGE_SIZE
                await asyncio.sleep(0.35)

        combined_tracks = new_tracks + cached_tracks
        saved = write_cache(combined_tracks)
        yield sse({
            "type": "complete",
            "loaded": len(combined_tracks),
            "total": len(combined_tracks),
            "tracks": combined_tracks,
            "source": "sync",
            "new_tracks": len(new_tracks),
            "synced_at": saved["synced_at"],
        })

    return StreamingResponse(event_generator(), media_type="text/event-stream")
