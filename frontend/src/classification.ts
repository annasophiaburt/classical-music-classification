import type { Classification, Track } from "./types";

type Rule = { tag: string; terms: string[] };

const rules: Rule[] = [
  { tag: "Baroque composer", terms: ["bach", "handel", "vivaldi", "purcell", "telemann", "corelli", "scarlatti"] },
  { tag: "Baroque style", terms: ["baroque"] },
  { tag: "Classical-era composer", terms: ["mozart", "haydn", "beethoven", "gluck", "clementi"] },
  { tag: "Classical style", terms: ["classical"] },
  { tag: "Romantic-era composer", terms: ["chopin", "liszt", "tchaikovsky", "rachmaninoff", "schumann", "brahms", "mendelssohn", "mahler", "wagner", "dvorak", "grieg", "saint-saens"] },
  { tag: "Impressionist composer", terms: ["debussy", "ravel", "satie"] },
  { tag: "Impressionist style", terms: ["impressionist"] },
  { tag: "Modern classical artist", terms: ["shostakovich", "prokofiev", "stravinsky", "philip glass", "max richter", "ludovico einaudi", "olafur arnalds", "nils frahm"] },
  { tag: "Modern classical style", terms: ["modern classical", "neo-classical", "neoclassical"] },
  { tag: "Film composer", terms: ["hans zimmer", "john williams", "ennio morricone", "ludwig goransson", "alexandre desplat"] },
  { tag: "Film score", terms: ["cinematic", "soundtrack", "original motion picture", "film score"] },
  { tag: "Choral", terms: ["choir", "choral", "chorus", "chorale", "voices", "singers", "requiem", "mass in", "missa", "motet", "cantata", "oratorio", "vespers"] },
  { tag: "Opera", terms: ["opera", "overture", "verdi", "puccini", "rossini", "donizetti"] },
  { tag: "Piano", terms: ["piano", "pianist"] },
  { tag: "Strings", terms: ["violin", "viola", "cello", "string quartet", "strings"] },
  { tag: "Orchestral", terms: ["orchestra", "orchestral", "philharmonic", "symphony", "symphonic", "concerto"] },
  { tag: "Chamber", terms: ["quartet", "quintet", "trio"] },
  { tag: "Sacred", terms: ["sacred", "requiem", "agnus dei", "ave maria", "gloria", "kyrie", "sanctus"] },
];

const formRules: Rule[] = [
  { tag: "Symphony", terms: ["symphony", "sinfonia"] },
  { tag: "Concerto", terms: ["concerto"] },
  { tag: "Sonata", terms: ["sonata"] },
  { tag: "Suite", terms: ["suite"] },
  { tag: "Quartet", terms: ["quartet"] },
  { tag: "Nocturne", terms: ["nocturne"] },
  { tag: "Prelude", terms: ["prelude"] },
  { tag: "Etude", terms: ["etude"] },
  { tag: "Fugue", terms: ["fugue"] },
  { tag: "Variations", terms: ["variation", "variations"] },
];

export const filterTags = [
  "Baroque composer", "Baroque style", "Classical-era composer", "Classical style",
  "Romantic-era composer", "Impressionist composer", "Impressionist style",
  "Modern classical artist", "Modern classical style", "Film composer", "Film score",
  "Choral", "Opera", "Sacred", "Piano", "Strings", "Orchestral", "Chamber",
  "Major", "Minor",
  "Symphony", "Concerto", "Sonata", "Suite", "Quartet", "Nocturne", "Prelude", "Etude", "Fugue", "Variations",
];

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2010-\u2015]/g, "-").toLocaleLowerCase();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Letter/number boundaries prevent matches such as "trio" in "patriotic".
function findWholeTerm(searchable: string, terms: string[]) {
  return terms.find((term) => {
    const pattern = escapeRegex(normalize(term)).replace(/ /g, "\\s+");
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${pattern}(?=$|[^\\p{L}\\p{N}])`, "u").test(searchable);
  });
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function structuredClassifications(searchable: string): Classification[] {
  const results: Classification[] = [];
  const numberedWork = searchable.match(/(?:^|[^\p{L}\p{N}])(symphony|sinfonia|concerto|sonata|suite|string quartet|quartet|nocturne|prelude|etude|fugue)\s+(?:no\.?|number)\s*(\d+)(?=$|[^\p{L}\p{N}])/u);
  if (numberedWork) {
    const form = numberedWork[1] === "sinfonia" ? "Symphony" : titleCase(numberedWork[1]);
    const tag = `${form} No. ${numberedWork[2]}`;
    results.push({ tags: [tag], reasons: [`${tag}: matched numbered work`] });
  }

  const opus = searchable.match(/(?:^|[^\p{L}\p{N}])op(?:us)?\.?\s*(\d+)(?:\s*[,;:]?\s*no\.?\s*(\d+))?(?=$|[^\p{L}\p{N}])/u);
  if (opus) {
    const tag = `Op. ${opus[1]}${opus[2] ? ` No. ${opus[2]}` : ""}`;
    results.push({ tags: [tag], reasons: [`${tag}: matched opus number`] });
  }

  const catalogues: Array<[RegExp, string]> = [
    [/(?:^|[^\p{L}\p{N}])bwv\s*(\d+)(?=$|[^\p{L}\p{N}])/u, "BWV"],
    [/(?:^|[^\p{L}\p{N}])(?:k|kv)\.?\s*(\d+)(?=$|[^\p{L}\p{N}])/u, "K."],
    [/(?:^|[^\p{L}\p{N}])hob\.?\s*([ivx]+:\d+)(?=$|[^\p{L}\p{N}])/u, "Hob."],
    [/(?:^|[^\p{L}\p{N}])d\.?\s*(\d+)(?=$|[^\p{L}\p{N}])/u, "D."],
    [/(?:^|[^\p{L}\p{N}])(rv|hwv)\s*(\d+)(?=$|[^\p{L}\p{N}])/u, "dynamic"],
  ];
  for (const [pattern, prefix] of catalogues) {
    const match = searchable.match(pattern);
    if (!match) continue;
    const dynamic = prefix === "dynamic";
    const label = dynamic ? match[1].toUpperCase() : prefix;
    const number = dynamic ? match[2] : match[1];
    const tag = `${label} ${number}`;
    results.push({ tags: [tag], reasons: [`${tag}: matched catalogue number`] });
  }

  const key = searchable.match(/(?:^|[^\p{L}\p{N}])in\s+([a-g])(?:[-\s](flat|sharp)|\s*([b#]))?\s+(major|minor)(?=$|[^\p{L}\p{N}])/u);
  if (key) {
    const accidental = key[2] ? `-${titleCase(key[2])}` : key[3] || "";
    const tonality = titleCase(key[4]);
    const tag = `${key[1].toUpperCase()}${accidental} ${tonality}`;
    results.push({
      tags: [tag, tonality],
      reasons: [`${tag}: matched musical key`, `${tonality}: matched musical-key tonality`],
    });
  }

  return results;
}

export function classifyTrack(track: Track): Classification {
  const searchable = normalize(`${track.name} ${track.artists.join(" ")} ${track.album}`);
  const title = normalize(track.name);
  const generalMatches = rules.flatMap((rule) => {
    const term = findWholeTerm(searchable, rule.terms);
    return term ? [{ tag: rule.tag, reason: `${rule.tag}: matched “${term}”` }] : [];
  });
  const formMatches = formRules.flatMap((rule) => {
    const term = findWholeTerm(title, rule.terms);
    return term ? [{ tag: rule.tag, reason: `${rule.tag}: matched title “${term}”` }] : [];
  });
  const matches = [...generalMatches, ...formMatches];
  const structured = structuredClassifications(searchable);
  const tags = [...new Set([...matches.map((match) => match.tag), ...structured.flatMap((item) => item.tags)])];
  const reasons = [...new Set([...matches.map((match) => match.reason), ...structured.flatMap((item) => item.reasons)])];
  return { tags, reasons };
}
