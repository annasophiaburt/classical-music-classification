export type Track = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  uri: string;
};

export type LibraryResponse = {
  total: number;
  loaded: number;
  tracks: Track[];
};

export type Classification = {
  tags: string[];
  reasons: string[];
};

export type ClassifiedTrack = Track & Classification;
