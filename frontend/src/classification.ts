import type { Classification, Track } from "./types";

type Rule = { tag: string; terms: string[] };

const rules: Rule[] = [
  { tag: "Baroque composer", terms: ["bach", "handel", "vivaldi", "purcell", "telemann", "corelli", "scarlatti"] },
  { tag: "Baroque style", terms: ["baroque"] },
  { tag: "Classical-era composer", terms: ["mozart", "haydn", "beethoven", "gluck", "clementi"] },
  { tag: "Classical style", terms: ["classical"] },
  { tag: "Romantic-era composer", terms: ["chopin", "liszt", "tchaikovsky", "rachmaninoff", "schumann", "brahms", "mendelssohn", "mahler", "wagner", "dvorak", "dvořák", "grieg", "saint-saens", "saint-saëns"] },
  { tag: "Impressionist composer", terms: ["debussy", "ravel", "satie"] },
  { tag: "Impressionist style", terms: ["impressionist", "impressionism"] },
  { tag: "20th-century classical composer", terms: ["shostakovich", "prokofiev", "stravinsky", "benjamin britten", "britten", "ralph vaughan williams", "vaughan williams", "holst", "sibelius", "bartok", "bartók", "messiaen", "copland"] },
  { tag: "Contemporary classical artist", terms: ["philip glass", "arvo part", "arvo pärt", "john rutter", "max richter", "ludovico einaudi", "olafur arnalds", "ólafur arnalds", "nils frahm"] },
  { tag: "Modern classical style", terms: ["modern classical", "contemporary classical", "neo-classical", "neoclassical"] },
  { tag: "Film/TV composer", terms: ["hans zimmer", "john williams", "ennio morricone", "ludwig goransson", "ludwig göransson", "alexandre desplat", "howard shore", "james horner", "thomas newman", "john barry", "bernard herrmann"] },
  { tag: "Score/Soundtrack", terms: ["cinematic", "soundtrack", "motion picture", "original score", "motion picture score", "film score", "theme from", "music from"] },
  { tag: "Choral composer", terms: ["john rutter", "eric whitacre", "morten lauridsen", "thomas tallis", "william byrd"] },
  { tag: "Choral", terms: ["choir", "choral", "chorus", "chorale", "requiem", "cantata", "oratorio", "vespers", "motet", "anthem", "a cappella"] },
  { tag: "Opera", terms: ["opera", "verdi", "puccini", "rossini", "donizetti", "bizet", "bellini"] },
  { tag: "Piano", terms: ["piano", "pianist"] },
  { tag: "Strings", terms: ["violin", "viola", "cello", "string quartet", "string orchestra", "strings"] },
  { tag: "Orchestral", terms: ["orchestra", "orchestral", "philharmonic", "symphony", "symphonic", "concerto"] },
  { tag: "Chamber", terms: ["chamber music", "string quartet", "quartet", "quintet", "sextet", "trio"] },
  { tag: "Sacred", terms: ["sacred", "requiem", "agnus dei", "ave maria", "gloria", "kyrie", "sanctus", "benedictus", "magnificat", "nunc dimittis", "te deum", "stabat mater"] },
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
  ...new Set([
    ...rules.map((rule) => rule.tag),
    ...formRules.map((rule) => rule.tag),
    "Major",
    "Minor",
  ]),
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
