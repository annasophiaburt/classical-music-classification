import base64
import os
import secrets
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

SCOPES = [
    "user-library-read",
    "user-read-private",
    "playlist-modify-private",
    "playlist-modify-public",
]

spotify_tokens = {}
oauth_state = None


@router.get("/login")
def login():
    global oauth_state

    oauth_state = secrets.token_urlsafe(32)

    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": " ".join(SCOPES),
        "state": oauth_state,
    }

    auth_url = (
        "https://accounts.spotify.com/authorize?"
        + urlencode(params)
    )

    return RedirectResponse(auth_url)


@router.get("/callback")
async def callback(code: str, state: str):
    if state != oauth_state:
        raise HTTPException(
            status_code=400,
            detail="Invalid OAuth state",
        )

    credentials = f"{CLIENT_ID}:{CLIENT_SECRET}"

    encoded_credentials = base64.b64encode(
        credentials.encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            headers={
                "Authorization": f"Basic {encoded_credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    tokens = response.json()

    spotify_tokens["access_token"] = tokens["access_token"]
    spotify_tokens["refresh_token"] = tokens.get(
        "refresh_token"
    )
    spotify_tokens["expires_in"] = tokens["expires_in"]

    return RedirectResponse(FRONTEND_URL)


def get_access_token():
    return spotify_tokens.get("access_token")
