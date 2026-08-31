import type { Classification, Track } from "./types";

type Rule = { tag: string; terms: string[] };

const rules: Rule[] = [
  { tag: "Baroque", terms: ["bach", "handel", "vivaldi", "purcell", "telemann", "corelli", "scarlatti", "baroque"] },
  { tag: "Classical", terms: ["mozart", "haydn", "beethoven", "gluck", "clementi", "classical"] },
  { tag: "Romantic", terms: ["chopin", "liszt", "tchaikovsky", "rachmaninoff", "schumann", "brahms", "mendelssohn", "mahler", "wagner", "dvorak", "grieg", "saint-saens", "romantic"] },
  { tag: "Impressionist", terms: ["debussy", "ravel", "satie", "impressionist"] },
  { tag: "Modern classical", terms: ["shostakovich", "prokofiev", "stravinsky", "philip glass", "max richter", "ludovico einaudi", "olafur arnalds", "nils frahm", "modern classical", "neo-classical", "neoclassical"] },
  { tag: "Film score", terms: ["hans zimmer", "john williams", "ennio morricone", "howard shore", "james horner", "ramin djawadi", "thomas newman", "alexandre desplat", "cinematic", "soundtrack", "original motion picture", "film score"] },
  { tag: "Choral", terms: ["choir", "choral", "chorus", "chorale", "voices", "singers", "requiem", "mass in", "missa", "motet", "cantata", "oratorio", "vespers"] },
  { tag: "Opera", terms: ["opera", "aria", "overture", "verdi", "puccini", "rossini", "donizetti"] },
  { tag: "Piano", terms: ["piano", "pianist", "nocturne", "etude", "étude", "waltz", "prelude"] },
  { tag: "Strings", terms: ["violin", "viola", "cello", "string quartet", "strings"] },
  { tag: "Orchestral", terms: ["orchestra", "orchestral", "philharmonic", "symphony", "symphonic", "concerto"] },
  { tag: "Chamber", terms: ["quartet", "quintet", "trio", "chamber"] },
  { tag: "Sacred", terms: ["sacred", "requiem", "mass", "missa", "agnus dei", "ave maria", "gloria", "kyrie", "sanctus"] },
];

const formRules: Rule[] = [
  { tag: "Symphony", terms: ["symphony", "sinfonia"] },
  { tag: "Concerto", terms: ["concerto"] },
  { tag: "Sonata", terms: ["sonata"] },
  { tag: "Nocturne", terms: ["nocturne"] },
  { tag: "Prelude", terms: ["prelude", "prélude"] },
  { tag: "Étude", terms: ["etude", "étude"] },
];

export const filterTags = [
  "Classical", "Romantic", "Baroque", "Impressionist", "Modern classical",
  "Film score", "Choral", "Opera", "Sacred", "Piano", "Strings", "Orchestral", "Chamber",
];

export function classifyTrack(track: Track): Classification {
  const searchable = `${track.name} ${track.artists.join(" ")} ${track.album}`.toLocaleLowerCase();
  const matches = [...rules, ...formRules].filter((rule) =>
    rule.terms.some((term) => searchable.includes(term)),
  );
  const tags = [...new Set(matches.map((match) => match.tag))];
  const reasons = matches.map((match) => {
    const term = match.terms.find((candidate) => searchable.includes(candidate));
    return `${match.tag}: matched “${term}”`;
  });

  return { tags, reasons };
}
