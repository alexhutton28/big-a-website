/**
 * Limitless TCG Deck Fetcher
 *
 * Fetches recent PTCG tournament standings from the Play Limitless API
 * and converts decklists into GameItem deck entries for the app.
 *
 * Current approach:
 * - Window: last 30 days
 * - Tournament filter: STANDARD format, >= 50 players
 * - Deck grouping: classify into a fixed deck-name taxonomy
 * - Fallback: unclassified decks with 6+ entries are included by inferred name;
 *   smaller groups are reported as examples only
 * - Aggregation: +1 per decklist occurrence in the window
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_TS = join(__dirname, '../src/app/limitless-check/decks.ts');

const BASE_URL = 'https://play.limitlesstcg.com/api';
const LOOKBACK_DAYS = 30;
const TOURNAMENT_LIMIT = 200;
const REQUEST_DELAY_MS = 600;
const PAGE_DELAY_MS = 300;
const MIN_PLAYERS = 50;
const MAX_DECK_IMAGES = 2;
const MIN_UNLISTED_DECK_ENTRIES = 6;
const IDENTITY_EXCLUDED_POKEMON = new Set([
  normalizeIdentityName('Fezandipiti ex'),
  normalizeIdentityName('Meowth ex'),
  normalizeIdentityName('Latias ex'),
]);

function normalizeIdentityName(value) {
  return String(value).trim().toLowerCase();
}

const DECK_CLASSIFIERS = [
  { name: 'Dragapult ex', all: ['dragapult'], imagePokemon: ['Dragapult ex'] },
  {
    name: "Marnie's Grimmsnarl ex",
    all: ['grimmsnarl'],
    imagePokemon: ["Marnie's Grimmsnarl ex"],
  },
  { name: 'Gardevoir ex', all: ['gardevoir'], imagePokemon: ['Gardevoir ex'] },
  { name: "N's Zoroark ex", all: ['zoroark'], imagePokemon: ["N's Zoroark ex"] },
  { name: 'Gholdengo ex', all: ['gholdengo'], imagePokemon: ['Gholdengo ex'] },
  { name: 'Mega Absol Box', all: ['absol'], imagePokemon: ['Mega Absol ex'] },
  {
    name: 'Froslass Munkidori',
    all: ['froslass', 'munkidori'],
    imagePokemon: ['Froslass', 'Munkidori'],
  },
  { name: 'Charizard ex', all: ['charizard'], imagePokemon: ['Charizard ex'] },
  {
    name: 'Crustle (Mysterious Rock Inn)',
    all: ['crustle'],
    imagePokemon: ['Crustle'],
  },
  { name: 'Raging Bolt ex', all: ['raging bolt'], imagePokemon: ['Raging Bolt ex'] },
  { name: 'Joltik Box', all: ['joltik'], imagePokemon: ['Joltik'] },
  {
    name: 'Tera Box',
    all: ['noctowl', 'ogerpon'],
    imagePokemon: ['Noctowl', 'Wellspring Mask Ogerpon ex'],
  },
  { name: 'Ceruledge ex', all: ['ceruledge'], imagePokemon: ['Ceruledge ex'] },
  {
    name: 'Alakazam (Powerful Hand)',
    all: ['alakazam'],
    imagePokemon: ['Alakazam ex'],
  },
  {
    name: 'Mega Kangaskhan ex',
    all: ['mega kangaskhan'],
    imagePokemon: ['Mega Kangaskhan ex'],
  },
  {
    name: 'Festival Lead',
    all: ['dipplin', 'thwackey'],
    imagePokemon: ['Dipplin', 'Thwackey'],
  },
  { name: 'Flareon ex', all: ['flareon'], imagePokemon: ['Flareon ex'] },
  {
    name: 'Mega Lucario ex',
    all: ['mega lucario'],
    imagePokemon: ['Mega Lucario ex'],
  },
  {
    name: "Rocket's Honchkrow",
    all: ['honchkrow'],
    imagePokemon: ["Rocket's Honchkrow ex"],
  },
  {
    name: 'Bloodmoon Ursaluna (Mad Bite)',
    all: ['bloodmoon', 'ursaluna'],
    imagePokemon: ['Bloodmoon Ursaluna ex'],
  },
  {
    name: 'Ogerpon Meganium',
    all: ['ogerpon', 'meganium'],
    imagePokemon: ['Ogerpon ex', 'Meganium'],
  },
  { name: 'Slowking (Seek Inspiration)', all: ['slowking'], imagePokemon: ['Slowking ex'] },
  {
    name: 'Ho-Oh Armarouge',
    all: ['ho-oh', 'armarouge'],
    imagePokemon: ['Ho-Oh ex', 'Armarouge'],
  },
  {
    name: 'Mega Sharpedo ex',
    all: ['mega sharpedo'],
    imagePokemon: ['Mega Sharpedo ex'],
  },
  {
    name: "Ethan's Typhlosion",
    all: ['typhlosion'],
    imagePokemon: ["Ethan's Typhlosion"],
  },
  {
    name: 'Mega Venusaur ex',
    all: ['mega venusaur'],
    imagePokemon: ['Mega Venusaur ex'],
  },
  { name: 'Greninja ex', all: ['greninja'], imagePokemon: ['Greninja ex'] },
  { name: 'Farigiraf ex', all: ['farigiraf'], imagePokemon: ['Farigiraf ex'] },
  {
    name: "Cynthia's Garchomp ex",
    all: ['garchomp'],
    imagePokemon: ["Cynthia's Garchomp ex"],
  },
  {
    name: "Rocket's Mewtwo ex",
    all: ['mewtwo'],
    imagePokemon: ["Rocket's Mewtwo ex"],
  },
  {
    name: 'Okidogi (Adrena-Power)',
    all: ['okidogi'],
    imagePokemon: ['Okidogi ex'],
  },
  {
    name: 'Great Tusk Mill',
    all: ['great tusk'],
    imagePokemon: ['Great Tusk ex'],
  },
  { name: 'Miraidon ex', all: ['miraidon'], imagePokemon: ['Miraidon ex'] },
  { name: 'Roaring Moon ex', all: ['roaring moon'], imagePokemon: ['Roaring Moon ex'] },
  {
    name: 'Poison Box',
    all: ['brute bonnet', 'budew'],
    imagePokemon: ['Brute Bonnet', 'Budew'],
  },
  {
    name: 'Future',
    all: ['iron crown', 'miraidon'],
    imagePokemon: ['Iron Crown ex', 'Miraidon ex'],
  },
  {
    name: 'Archaludon ex',
    all: ['archaludon'],
    imagePokemon: ['Archaludon ex'],
  },
  {
    name: 'Ogerpon Box',
    all: ['ogerpon'],
    imagePokemon: ['Ogerpon ex'],
  },
  {
    name: "Ethan's Magcargo",
    all: ['magcargo'],
    imagePokemon: ["Ethan's Magcargo"],
  },
  {
    name: 'Mega Lopunny ex',
    all: ['mega lopunny'],
    imagePokemon: ['Mega Lopunny ex'],
  },
  {
    name: 'Mega Froslass ex',
    all: ['mega froslass'],
    imagePokemon: ['Mega Froslass ex'],
  },
  {
    name: 'Toxtricity (Sinister Surge)',
    all: ['toxtricity'],
    imagePokemon: ['Toxtricity ex'],
  },
  {
    name: 'Pidgeot Control',
    all: ['pidgeot'],
    imagePokemon: ['Pidgeot ex'],
  },
  { name: 'Espathra ex', all: ['espathra'], imagePokemon: ['Espathra ex'] },
  {
    name: 'Conkeldurr (Gutsy Swing)',
    all: ['conkeldurr'],
    imagePokemon: ['Conkeldurr'],
  },
  {
    name: "Rocket's Spidops",
    all: ['spidops'],
    imagePokemon: ["Rocket's Spidops ex"],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteTsString(value) {
  const normalized = String(value).replace(/\\/g, '\\\\');

  if (normalized.includes("'")) {
    return `"${normalized.replace(/\"/g, '\\\"')}"`;
  }

  return `'${normalized.replace(/'/g, "\\'")}'`;
}

function renderGameItemTs(item) {
  const hasMultipleImages = item.image.length > 1;
  const imagesValue = hasMultipleImages
    ? `\n${item.image.map((value) => `      ${quoteTsString(value)},`).join('\n')}\n    `
    : item.image.map(quoteTsString).join(', ');

  return [
    '  {',
    `    id: ${quoteTsString(item.id)},`,
    `    name: ${quoteTsString(item.name)},`,
    `    hyperlink: ${quoteTsString(item.hyperlink)},`,
    `    entries: ${item.entries},`,
    `    image: [${imagesValue}],`,
    `    type: 'Deck',`,
    `    set: null,`,
    '  }',
  ].join('\n');
}

function renderGameItemsTs(items) {
  const renderedItems = items.map(renderGameItemTs).join(',\n');
  return `export const decks: GameItem[] = [\n${renderedItems}\n];\n`;
}

async function apiFetch(url, retries = 3) {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const wait = parseInt(response.headers.get('Retry-After') || '60', 10) * 1000;
        console.log(`  Rate limited - waiting ${wait / 1000}s before retry...`);
        await sleep(wait);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await sleep(2000 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

function isEligibleTournament(tournament) {
  return tournament.format === 'STANDARD' && tournament.players >= MIN_PLAYERS;
}

async function fetchTournamentsSince(sinceDate) {
  const tournaments = [];
  let page = 1;

  while (true) {
    process.stdout.write(`  Tournament list page ${page}...`);
    const data = await apiFetch(
      `${BASE_URL}/tournaments?game=PTCG&limit=${TOURNAMENT_LIMIT}&page=${page}`
    );

    if (!data || data.length === 0) {
      console.log(' (empty, done)');
      break;
    }

    let hitOld = false;
    for (const t of data) {
      if (sinceDate && new Date(t.date) <= new Date(sinceDate)) {
        hitOld = true;
        break;
      }
      if (isEligibleTournament(t)) tournaments.push(t);
    }

    console.log(` +${data.length} scanned (eligible total: ${tournaments.length})`);

    if (hitOld || data.length < TOURNAMENT_LIMIT) break;
    page++;
    await sleep(PAGE_DELAY_MS);
  }

  return tournaments;
}

function nameToImageSlug(name) {
  let n = String(name);

  // Team Rocket cards use the base Pokemon art slug.
  n = n.replace(/^Team Rocket's\s+/i, '');

  // Strip trainer possessives: "N's ", "Marnie's ", "Ash's ", etc.
  n = n.replace(/^[A-Z][a-zA-Z]*'s\s+/i, '');

  // Rotom forms: "Fan Rotom" -> "rotom-fan"
  const rotomMatch = n.match(/^(\w+)\s+Rotom$/i);
  if (rotomMatch) {
    return `rotom-${rotomMatch[1].toLowerCase()}`;
  }

  // Mega forms: "Mega Kangaskhan ex" -> "kangaskhan-mega"
  const megaMatch = n.match(/^Mega\s+(.+?)(?:\s+(?:ex|v|vmax|vstar|gx))?$/i);
  if (megaMatch) {
    return (
      megaMatch[1]
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + '-mega'
    );
  }

  // Ogerpon masks use distinct art slugs except Teal Mask, which stays plain `ogerpon`.
  if (/^Wellspring Mask Ogerpon/i.test(n)) return 'ogerpon-wellspring';
  if (/^Hearthflame Mask Ogerpon/i.test(n)) return 'ogerpon-hearthflame';
  if (/^Cornerstone Mask Ogerpon/i.test(n)) return 'ogerpon-cornerstone';
  n = n.replace(/^Teal Mask\s+/i, '');

  // Bloodmoon Ursaluna art slug is ordered as "ursaluna-bloodmoon".
  if (/^Bloodmoon\s+Ursaluna/i.test(n)) return 'ursaluna-bloodmoon';

  n = n.replace(/\s+(ex|v|vmax|vstar|gx|v-union)$/i, '');

  return n
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function normalizeToken(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cardWeight(cardName, count) {
  const premiumTag = /(\sex|\svstar|\svmax|\sgx|\sv-union)$/i.test(cardName) ? 2 : 0;
  return count + premiumTag;
}

function rankPokemonCards(pokemonCards) {
  const map = new Map();

  for (const card of pokemonCards ?? []) {
    const name = card?.name?.trim();
    const count = Number(card?.count || 0);
    if (!name || count <= 0) continue;

    const current = map.get(name) || 0;
    map.set(name, current + count);
  }

  return [...map.entries()]
    .map(([name, count]) => ({ name, count, weight: cardWeight(name, count) }))
    .sort((a, b) => b.weight - a.weight || b.count - a.count || a.name.localeCompare(b.name));
}

function isExLikePokemon(name) {
  return /(\sex|\svstar|\svmax|\sgx|\sv-union)$/i.test(name);
}

function isIdentityExcludedPokemon(name) {
  return IDENTITY_EXCLUDED_POKEMON.has(normalizeIdentityName(name));
}

function selectFallbackTitlePokemon(pokemonCards) {
  const ranked = rankPokemonCards(pokemonCards).filter(
    (entry) => !isIdentityExcludedPokemon(entry.name)
  );
  const exCandidates = ranked.filter((entry) => isExLikePokemon(entry.name));

  if (exCandidates.length > 0) {
    return exCandidates.slice(0, MAX_DECK_IMAGES).map((entry) => entry.name);
  }

  const nonExCandidate = ranked[0];
  return nonExCandidate ? [nonExCandidate.name] : [];

  return ranked.slice(0, MAX_DECK_IMAGES).map((x) => x.name);
}

function getNormalizedPokemonPool(pokemonCards) {
  return (pokemonCards ?? [])
    .map((card) => normalizeToken(card?.name ?? ''))
    .filter((name) => name.length > 0);
}

function hasPokemon(pokemonPool, token) {
  const normToken = normalizeToken(token);
  return pokemonPool.some((name) => name.includes(normToken));
}

function classifyDeck(pokemonCards) {
  const pokemonPool = getNormalizedPokemonPool(pokemonCards);

  for (const classifier of DECK_CLASSIFIERS) {
    const isMatch = (classifier.all ?? []).every((token) => hasPokemon(pokemonPool, token));
    if (!isMatch) continue;

    return {
      matched: true,
      name: classifier.name,
      imagePokemon: classifier.imagePokemon ?? [],
    };
  }

  return {
    matched: false,
    name: 'Other',
    imagePokemon: selectFallbackTitlePokemon(pokemonCards),
  };
}

async function main() {
  console.log('=== Limitless TCG Deck Fetcher ===\n');

  const defaultSince = new Date();
  defaultSince.setDate(defaultSince.getDate() - LOOKBACK_DAYS);
  const fetchSince = defaultSince.toISOString();

  console.log(
    `Fetching STANDARD tournaments from last ${LOOKBACK_DAYS} days (since ${defaultSince.toISOString().slice(0, 10)})...`
  );

  let tournaments = [];
  try {
    tournaments = await fetchTournamentsSince(fetchSince);
  } catch (err) {
    console.error('Fatal: could not fetch tournament list:', err.message);
    process.exit(1);
  }

  tournaments.sort((a, b) => new Date(b.date) - new Date(a.date));
  console.log(`\nTournaments to process: ${tournaments.length}\n`);

  const archetypeMap = new Map();
  const unclassifiedDecks = new Map();
  const warnings = [];
  let failedCount = 0;
  let decklistsProcessed = 0;

  for (let i = 0; i < tournaments.length; i++) {
    const t = tournaments[i];

    if (i > 0 && i % 25 === 0) {
      const pct = Math.round((i / tournaments.length) * 100);
      console.log(`  Progress: ${i}/${tournaments.length} (${pct}%)...`);
    }

    try {
      const standings = await apiFetch(`${BASE_URL}/tournaments/${t.id}/standings`);
      await sleep(REQUEST_DELAY_MS);

      for (const player of standings) {
        const pokemon = player?.decklist?.pokemon;
        if (!Array.isArray(pokemon) || pokemon.length === 0) continue;

        const classification = classifyDeck(pokemon);
        const archetypeName = classification.name;
        const keyPokemon = classification.imagePokemon;
        decklistsProcessed++;

        if (!classification.matched) {
          const exampleName = keyPokemon.length > 0 ? keyPokemon.join(' / ') : 'Unknown Deck';
          const current = unclassifiedDecks.get(exampleName);

          if (current) {
            current.count += 1;
            if (!current.latestDate || new Date(t.date) > new Date(current.latestDate)) {
              current.latestDate = t.date;
              current.hyperlink = `https://play.limitlesstcg.com/tournament/${t.id}`;
            }
          } else {
            unclassifiedDecks.set(exampleName, {
              count: 1,
              tournamentName: t.name,
              playerName: player.name ?? 'Unknown Player',
              imagePokemon: keyPokemon,
              latestDate: t.date,
              hyperlink: `https://play.limitlesstcg.com/tournament/${t.id}`,
            });
          }

          continue;
        }

        if (!archetypeMap.has(archetypeName)) {
          archetypeMap.set(archetypeName, {
            id: slugify(archetypeName),
            name: archetypeName,
            entries: 0,
            imagePokemon: keyPokemon,
            latestDate: t.date,
            hyperlink: `https://play.limitlesstcg.com/tournament/${t.id}`,
          });
        }

        const entry = archetypeMap.get(archetypeName);
        entry.entries += 1;

        if (!entry.imagePokemon || entry.imagePokemon.length === 0) {
          entry.imagePokemon = keyPokemon;
        }

        if (!entry.latestDate || new Date(t.date) > new Date(entry.latestDate)) {
          entry.latestDate = t.date;
          entry.hyperlink = `https://play.limitlesstcg.com/tournament/${t.id}`;
        }
      }
    } catch (err) {
      failedCount++;
      warnings.push(`${t.id} "${t.name}" (${t.date?.slice(0, 10)}): ${err.message}`);
    }
  }

  const promotedUnclassifiedDecks = [...unclassifiedDecks.entries()]
    .filter(([, data]) => data.count >= MIN_UNLISTED_DECK_ENTRIES)
    .map(([name, data]) => ({
      id: slugify(name),
      name,
      entries: data.count,
      imagePokemon: data.imagePokemon ?? [],
      latestDate: data.latestDate,
      hyperlink: data.hyperlink,
    }));

  const outputDecks = [...archetypeMap.values(), ...promotedUnclassifiedDecks]
    .sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name))
    .map((d) => ({
      id: d.id,
      name: d.name,
      hyperlink: d.hyperlink,
      entries: d.entries,
      image: (d.imagePokemon || [])
        .slice(0, MAX_DECK_IMAGES)
        .map((name) => `https://r2.limitlesstcg.net/pokemon/gen9/${nameToImageSlug(name)}.png`),
      type: 'Deck',
      set: null,
    }));

  const unclassifiedExamples = [...unclassifiedDecks.entries()]
    .filter(([, data]) => data.count < MIN_UNLISTED_DECK_ENTRIES)
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, 8);

  const warningBlock =
    warnings.length > 0 ? warnings.map((w) => `// WARNING: ${w}`).join('\n') + '\n' : '';

  const tsContent =
    `// AUTO-GENERATED by scripts/fetch-decks.mjs - do not edit manually.\n` +
    `// Last updated   : ${new Date().toISOString()}\n` +
    `// Lookback       : ${LOOKBACK_DAYS} days\n` +
    `// Decklists seen : ${decklistsProcessed}\n` +
    `// Archetypes out : ${outputDecks.length}\n` +
    `// Tournaments    : ${tournaments.length - failedCount} processed, ${failedCount} failed\n` +
    warningBlock +
    `\nimport type { GameItem } from './types';\n\n` +
    renderGameItemsTs(outputDecks);

  writeFileSync(OUTPUT_TS, tsContent, 'utf-8');

  console.log(
    `\nGenerated decks file: ${outputDecks.length} archetypes from ${decklistsProcessed} decklists.`
  );
  if (promotedUnclassifiedDecks.length > 0) {
    console.log(
      `Included ${promotedUnclassifiedDecks.length} inferred deck groups with ${MIN_UNLISTED_DECK_ENTRIES}+ entries.`
    );
  }

  const reportedUnclassifiedCount = [...unclassifiedDecks.values()].filter(
    (data) => data.count < MIN_UNLISTED_DECK_ENTRIES
  ).length;

  if (reportedUnclassifiedCount > 0) {
    console.log(`\nUnclassified deck examples (${reportedUnclassifiedCount} small groups):`);
    unclassifiedExamples.forEach(([name, data]) => {
      console.log(
        `  - ${name}: ${data.count} decklists (example: ${data.playerName} in ${data.tournamentName})`
      );
    });
  }
  if (failedCount > 0) {
    console.log(`\nWarning: ${failedCount} tournament(s) failed:`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
