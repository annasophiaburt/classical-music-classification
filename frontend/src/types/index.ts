export type Track = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  uri: string;
  added_at?: string | null;
  explicit?: boolean;
};

export type LibraryResponse = {
  total: number;
  loaded: number;
  tracks: Track[];
  source?: "cache" | "spotify" | "sync" | "demo";
  synced_at?: string | null;
  new_tracks?: number;
};

export type Classification = {
  tags: string[];
  reasons: string[];
};

export type ClassifiedTrack = Track & Classification;
