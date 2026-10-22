# Classify | Classical Music Classification

A full-stack web application that helps listeners rediscover classical music in their Spotify Liked Songs and turn their discoveries into playlists.

I built Classify out of a frustration I regularly run into: having a classical piece stuck in my head but struggling to find it again. Classical track names can be long and difficult to remember, especially when they include work numbers, keys, movements, and performers. 

An earworm is particularly annoying when I know the piece is somewhere in my library but cannot remember its name!

Classify helps me narrow down the possibilities using what I do remember, such as the composer, period, instrument, form, or key, then turn the results into playlists I can return to. 

The project brings together a React and TypeScript interface, a Python API, Spotify integration, and deployment across Cloudflare and Render.

## Live application and access

**Main URL: [classify-project.pages.dev](https://classify-project.pages.dev/)**

I use **Cloudflare Pages** to host the frontend and **Render** to host the FastAPI backend.

**Access is limited to approved accounts. Please [message me on LinkedIn](https://www.linkedin.com/in/anna-burt-b70a2020a/) to request access or arrange a demo.** I'm happy to walk through the application, its architecture, and the implementation with prospective employers and collaborators.

### Spotify API limitations

Classify uses the Spotify Web API in development mode, which allows a maximum of **5 authorised users**. **2 users are currently added**, leaving 3 available places. Accounts must be added before they can use the Spotify integration, so access is arranged individually. See [Spotify's development-mode limits](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

Spotify's [Developer Policy](https://developer.spotify.com/policy) prohibits feeding Spotify Content into machine learning or AI models, including LLMs, as well as using it for training. This constraint shaped Classify's implementation: classification is limited to word matching and regular expressions over track metadata. For example, regex identifies major/minor keys from text such as "in C Minor". Results depend on the wording of the metadata, so missing or differently formatted information can lead to missed matches.

Spotify also applies API request quotas and rate limits. Library caching and incremental sync reduce repeated requests, but loading or syncing may still require waiting when a limit is reached.

**Try "Load Demo Songs" to explore the app without connecting Spotify.** This option loads a local sample library for browsing, classification, and filtering without making Spotify API requests. Creating a Spotify playlist requires an authorised Spotify connection.

## What it does

- Provides a responsive interface optimised for both mobile and desktop use.
- Connects to Spotify and retrieves Liked Songs with live loading progress.
- Classifies tracks using their titles, artists, and album metadata, with tags for musical periods, instruments, forms, and keys.
- Combines keyword search with AND/OR tag filtering to narrow down a library.
- Lets users select matching tracks and create a private Spotify playlist.
- Caches the library and supports syncing newly liked songs to reduce repeated API requests.
- Includes a **Load Demo Songs** option for exploring the interface with local sample tracks, without connecting Spotify or making Spotify API requests.

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
