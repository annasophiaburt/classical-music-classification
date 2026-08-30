# Classical Music Classification 🎻🎹

A web application for exploring, filtering, and organising your Spotify Liked Songs.

The application connects to a user's Spotify account, loads their music library, and provides tools for finding songs using keywords and music classifications. Matching songs can then be selected and saved directly to a new Spotify playlist.

## Tech Stack

### Frontend

* React
* TypeScript
* Vite

### Backend

* Python
* FastAPI

### APIs

* Spotify Web API

---

## Development Roadmap

### 1. React ↔ FastAPI Connection

Set up the basic communication between the React frontend and FastAPI backend.

Initial test endpoint:

```text
GET /api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

**Goal:** Confirm that the frontend can successfully make requests to the Python backend.

* [ ] Create FastAPI application
* [ ] Create `/api/health` endpoint
* [ ] Configure CORS for local React development
* [ ] Connect React frontend to FastAPI
* [ ] Display/test backend response

---

### 2. Spotify Authentication

Implement Spotify authentication through the FastAPI backend.

The backend will handle the Spotify OAuth flow so that sensitive credentials such as the Spotify Client Secret are never exposed to the frontend.

```text
React
  ↓
FastAPI /auth/login
  ↓
Spotify Login
  ↓
FastAPI /auth/callback
  ↓
React
```

* [ ] Add Spotify credentials to backend environment variables
* [ ] Implement `/auth/login`
* [ ] Implement `/auth/callback`
* [ ] Exchange Spotify authorization code for access token
* [ ] Handle token refresh
* [ ] Add logout functionality

---

### 3. Fetch Current Spotify User

Use the authenticated Spotify session to retrieve information about the currently logged-in user.

* [ ] Create `/api/me`
* [ ] Fetch Spotify user profile
* [ ] Return relevant profile information to React
* [ ] Display logged-in user in the UI

---

### 4. Fetch All Liked Songs

Retrieve the user's complete Liked Songs library from Spotify.

Because Spotify returns results in pages, the backend will repeatedly request tracks until the entire library has been loaded.

* [ ] Create `/api/library`
* [ ] Fetch first page of Liked Songs
* [ ] Handle Spotify pagination
* [ ] Fetch the complete library
* [ ] Extract relevant track metadata
* [ ] Handle API errors and rate limits

Relevant track information may include:

```text
Track name
Artist
Album
Spotify URI / ID
```

---

### 5. Library Loading Progress

Provide feedback while a potentially large Spotify library is being retrieved.

Example:

```text
Loading your Spotify library...

50 / 1,823
100 / 1,823
150 / 1,823
...
1,823 / 1,823

Library loaded!
```

* [ ] Determine total library size
* [ ] Send loading progress to frontend
* [ ] Add React loading screen
* [ ] Add progress bar
* [ ] Display `loaded / total` count
* [ ] Handle loading failures gracefully

---

### 6. Display Songs in React

Display the loaded Spotify library in an easy-to-browse interface.

Possible layout:

```text
Your Library

Search: [_____________________]

------------------------------------------------
Track                 Artist              Album
------------------------------------------------
Nocturne No. 2        Frédéric Chopin     ...
Clair de lune         Claude Debussy      ...
Violin Concerto       Tchaikovsky         ...
------------------------------------------------
```

* [ ] Create song list/table component
* [ ] Display track name
* [ ] Display artist
* [ ] Display album
* [ ] Add loading state
* [ ] Add empty state
* [ ] Make large libraries performant

---

### 7. Keyword Filtering

Allow users to filter their library using keywords and tags.

Example:

```text
Keywords

[piano] [violin] [romantic] [nocturne]

+ Add keyword
```

Potential searchable information:

* Track names

* Artist names

* Album names

* Composer names

* Musical forms

* Instruments

* Musical periods

* [ ] Create keyword input

* [ ] Support multiple keywords

* [ ] Filter displayed tracks

* [ ] Allow keywords to be removed

* [ ] Add AND/OR matching options

---

### 8. Smarter Classification

Build a classification system capable of finding music beyond literal keyword matches.

For example:

```text
Chopin
    ↓
Romantic
Piano
Classical

Paganini
    ↓
Romantic
Violin
Classical
```

Potential classifications include:

```text
Period
├── Baroque
├── Classical
├── Romantic
├── Impressionist
└── Modern

Instrument
├── Piano
├── Violin
├── Cello
├── Orchestra
└── Voice

Form
├── Concerto
├── Sonata
├── Nocturne
├── Symphony
├── Étude
└── Prelude
```

* [ ] Build composer classification data
* [ ] Detect instruments
* [ ] Detect musical periods
* [ ] Detect musical forms
* [ ] Develop track scoring/ranking system
* [ ] Explain why each result matched

---

### 9. Select / Deselect Results

Allow the user to choose exactly which matching tracks should be included in their playlist.

```text
73 results

[✓] Select all

[✓] Chopin — Nocturne No. 2
[✓] Liszt — Liebestraum
[ ] Debussy — Clair de lune
[✓] Rachmaninoff — Piano Concerto No. 2
```

* [ ] Add track checkboxes
* [ ] Add Select All
* [ ] Add Deselect All
* [ ] Display selected track count
* [ ] Preserve selections while filtering

---

### 10. Create Spotify Playlist

Create a new Spotify playlist containing the selected tracks.

```text
Playlist name

[ Romantic Piano 🎹              ]

73 tracks selected

[ Create Playlist ]
```

After creation:

```text
✓ Playlist created!

Romantic Piano 🎹
73 tracks

[ Open in Spotify ]
```

* [ ] Add playlist name input
* [ ] Choose public/private playlist
* [ ] Create playlist through Spotify API
* [ ] Add selected tracks
* [ ] Handle large playlists in batches
* [ ] Display creation progress
* [ ] Link to the finished Spotify playlist
