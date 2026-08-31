import httpx
from fastapi import APIRouter, HTTPException
import asyncio
import json

from fastapi.responses import StreamingResponse

from app.auth import get_access_token

router = APIRouter(prefix="/api", tags=["spotify"])


@router.get("/me")
async def get_me():
    access_token = get_access_token()

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Not logged into Spotify",
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me",
            headers={
                "Authorization": f"Bearer {access_token}"
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    return response.json()

@router.get("/library")
async def get_library():
    access_token = get_access_token()

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Not logged into Spotify",
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me/tracks",
            headers={
                "Authorization": f"Bearer {access_token}"
            },
            params={
                "limit": 50,
                "offset": 0,
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    data = response.json()

    tracks = []

    for item in data["items"]:
        track = item["track"]

        tracks.append(
            {
                "id": track["id"],
                "name": track["name"],
                "artists": [
                    artist["name"]
                    for artist in track["artists"]
                ],
                "album": track["album"]["name"],
                "uri": track["uri"],
            }
        )

    return {
        "total": data["total"],
        "loaded": len(tracks),
        "tracks": tracks,
    }

@router.get("/library/stream")
async def stream_library():
    access_token = get_access_token()

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Not logged into Spotify",
        )

    async def event_generator():
        tracks = []
        offset = 0
        limit = 50
        total = None

        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(
                    "https://api.spotify.com/v1/me/tracks",
                    headers={
                        "Authorization": f"Bearer {access_token}"
                    },
                    params={
                        "limit": limit,
                        "offset": offset,
                    },
                )

                if response.status_code != 200:
                    yield (
                        "data: "
                        + json.dumps(
                            {
                                "type": "error",
                                "status": response.status_code,
                                "message": response.text,
                            }
                        )
                        + "\n\n"
                    )
                    return

                data = response.json()

                if total is None:
                    total = data["total"]

                for item in data["items"]:
                    track = item["track"]

                    tracks.append(
                        {
                            "id": track["id"],
                            "name": track["name"],
                            "artists": [
                                artist["name"]
                                for artist in track["artists"]
                            ],
                            "album": track["album"]["name"],
                            "uri": track["uri"],
                        }
                    )

                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "progress",
                            "loaded": len(tracks),
                            "total": total,
                        }
                    )
                    + "\n\n"
                )

                if len(data["items"]) < limit:
                    break

                offset += limit

                await asyncio.sleep(0.05)

        yield (
            "data: "
            + json.dumps(
                {
                    "type": "complete",
                    "loaded": len(tracks),
                    "total": total,
                    "tracks": tracks,
                }
            )
            + "\n\n"
        )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )