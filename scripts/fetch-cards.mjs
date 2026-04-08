/**
 * Limitless TCG Card Fetcher
 *
 * Fetches all PTCG tournament standings from the Limitless API and aggregates
 * Pokemon card appearance counts. Each card scores +1 per unique decklist it
 * appears in, regardless of how many copies are included.
 *
 * Output: top 100 most-recently-active cards with >= 50 appearances.
 *
 * Incremental mode: on repeat runs only new tournaments (since last fetch) are
 * processed, making subsequent runs much faster than the initial backfill.
 * To force a full re-run from scratch, delete cards-data.json first.
 *
 * Usage:
 *   npm run fetch-cards            — incremental update
 *   node scripts/fetch-cards.mjs  — same
 *
 * NOTE on first run: Fetches the last 5 years of tournaments (~1-3 hours with
 * rate limiting). Progress is checkpointed every 50 tournaments — safe to
 * interrupt and resume. Subsequent incremental runs are fast (minutes).
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_TS = join(__dirname, '../src/app/limitless-check/cards-generated.ts');
const DATA_JSON = join(__dirname, '../src/app/limitless-check/cards-data.json');

const BASE_URL = 'https://play.limitlesstcg.com/api';
const MIN_APPEARANCES = 10; // lower threshold since we're only scanning majors
const MAX_CARDS = 100;
const TOURNAMENT_LIMIT = 200; // max per page (API maximum)
const REQUEST_DELAY_MS = 600; // ms between standings fetches (stay under rate limit)
const PAGE_DELAY_MS = 300; // ms between tournament list pages
const LOOKBACK_YEARS = 5; // default history window for first run
const CHECKPOINT_EVERY = 50; // save progress to disk every N tournaments
const MIN_PLAYERS = 80; // ignore events below this player count
// Keywords that identify official organised-play majors (case-insensitive)
const MAJOR_EVENT_KEYWORDS = [
  'regional',
  'special event',
  'champions league',
  'euic',
  'laic',
  'naic',
  'worlds',
  'premier ball league',
  'korean league',
  'international championship',
];

function isMajorEvent(tournament) {
  if (tournament.players < MIN_PLAYERS) return false;
  const name = tournament.name.toLowerCase();
  return MAJOR_EVENT_KEYWORDS.some((kw) => name.includes(kw));
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteTsString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function renderGameItemTs(item) {
  const setValue = item.set === null ? 'null' : quoteTsString(item.set);
  const imagesValue = `[${item.image.map(quoteTsString).join(', ')}]`;

  return [
    '  {',
    `    id: ${quoteTsString(item.id)},`,
    `    name: ${quoteTsString(item.name)},`,
    `    hyperlink: ${quoteTsString(item.hyperlink)},`,
    `    entries: ${item.entries},`,
    `    image: ${imagesValue},`,
    `    type: 'Card',`,
    `    set: ${setValue},`,
    '  }',
  ].join('\n');
}

function renderGameItemsTs(items) {
  const renderedItems = items.map(renderGameItemTs).join(',\n');

  return `export const cards: GameItem[] = [\n${renderedItems}\n];\n`;
}

/**
 * Fetch a URL with automatic retry, 429 handling, and rate-limit header awareness.
 */
async function apiFetch(url, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const wait = parseInt(response.headers.get('Retry-After') || '60') * 1000;
        console.log(`  Rate limited — waiting ${wait / 1000}s before retry...`);
        await sleep(wait);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Slow down proactively if the remaining budget is very low
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');
      if (remaining !== null && parseInt(remaining) <= 5) {
        const resetMs = reset ? Math.max(0, parseInt(reset) * 1000 - Date.now()) : 60_000;
        console.log(
          `  Rate limit low (${remaining} left) — waiting ${Math.ceil(resetMs / 1000)}s...`
        );
        await sleep(resetMs + 1000);
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

// ---------------------------------------------------------------------------
// Tournament list fetcher (paginated, stops early in incremental mode)
// ---------------------------------------------------------------------------

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

    // In incremental mode: stop once we reach tournaments we've already seen.
    // The API returns newest-first, so once a date is <= sinceDate we can stop.
    let hitOld = false;
    for (const t of data) {
      if (sinceDate && new Date(t.date) <= new Date(sinceDate)) {
        hitOld = true;
        break;
      }
      if (isMajorEvent(t)) tournaments.push(t);
    }

    console.log(
      ` +${tournaments.length - (tournaments.length - (hitOld ? data.findIndex((t) => sinceDate && new Date(t.date) <= new Date(sinceDate)) : data.length))} (total new: ${tournaments.length})`
    );

    if (hitOld || data.length < TOURNAMENT_LIMIT) break;
    page++;
    await sleep(PAGE_DELAY_MS);
  }

  return tournaments;
}

// ---------------------------------------------------------------------------
// Card name → image slug (best-effort; some edge cases need manual correction)
// ---------------------------------------------------------------------------

function nameToImageSlug(name) {
  let n = name;

  // Team Rocket cards use the base Pokemon art slug.
  n = n.replace(/^Team Rocket's\s+/i, '');

  // Strip trainer possessives: "N's ", "Marnie's ", "Ash's ", etc.
  n = n.replace(/^[A-Z][a-zA-Z]*'s\s+/i, '');

  // Rotom forms: "Fan Rotom" → "rotom-fan"
  const rotomMatch = n.match(/^(\w+)\s+Rotom$/i);
  if (rotomMatch) {
    return `rotom-${rotomMatch[1].toLowerCase()}`;
  }

  // Mega forms: "Mega Kangaskhan ex" → "kangaskhan-mega"
  const megaMatch = n.match(/^Mega\s+(.+?)(?:\s+(?:ex|v|vmax|vstar|gx))?$/i);
  if (megaMatch) {
    return (
      megaMatch[1]
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + '-mega'
    );
  }

  // Ogerpon form prefixes
  n = n.replace(/^(Teal Mask|Wellspring Mask|Hearthflame Mask|Cornerstone Mask)\s+/i, '');

  // Strip card suffix (ex, v, vmax, vstar, gx, v-union)
  n = n.replace(/\s+(ex|v|vmax|vstar|gx|v-union)$/i, '');

  return n
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function nameToId(name) {
  return name
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Limitless TCG Card Fetcher ===\n');

  // Load existing aggregated data (incremental mode)
  let existingData = { generatedAt: null, lastFetchedDate: null, cardMap: {} };
  try {
    const raw = readFileSync(DATA_JSON, 'utf-8');
    existingData = JSON.parse(raw);
    console.log(`Loaded existing data from cards-data.json`);
    console.log(`  Last fetched : ${existingData.lastFetchedDate}`);
    console.log(`  Known cards  : ${Object.keys(existingData.cardMap).length}\n`);
  } catch {
    console.log('No existing cards-data.json found — starting full historical backfill.');
    console.log('⚠️  First run may take 30-90+ minutes depending on tournament volume.\n');
  }

  // On first run, default to last LOOKBACK_YEARS years instead of full all-time history
  const defaultSince = new Date();
  defaultSince.setFullYear(defaultSince.getFullYear() - LOOKBACK_YEARS);
  const fetchSince = existingData.lastFetchedDate ?? defaultSince.toISOString();

  console.log(
    existingData.lastFetchedDate
      ? `Fetching tournaments after ${existingData.lastFetchedDate}...`
      : `Fetching tournaments from the last ${LOOKBACK_YEARS} years (since ${defaultSince.toISOString().slice(0, 10)})...`
  );

  let newTournaments;
  try {
    newTournaments = await fetchTournamentsSince(fetchSince);
  } catch (err) {
    console.error('Fatal: could not fetch tournament list:', err.message);
    process.exit(1);
  }

  // Sort newest → oldest so lastSeenDate tracking is correct
  newTournaments.sort((a, b) => new Date(b.date) - new Date(a.date));
  console.log(`\nNew tournaments to process: ${newTournaments.length}\n`);

  // Hydrate existing cardMap and resume set (for interrupted runs)
  const cardMap = new Map(
    Object.entries(existingData.cardMap).map(([name, data]) => [name, { ...data }])
  );
  const processedIds = new Set(existingData.processedIds ?? []);
  if (processedIds.size > 0) {
    console.log(
      `Resuming interrupted run — ${processedIds.size} tournaments already done, skipping.\n`
    );
  }

  let failedCount = 0;
  const warnings = [];
  let newestSuccessDate = null;

  // Saves current progress mid-run so an interruption can be resumed
  function saveCheckpoint() {
    writeFileSync(
      DATA_JSON,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          lastFetchedDate: existingData.lastFetchedDate, // cursor only advances on full completion
          processedIds: [...processedIds],
          cardMap: Object.fromEntries(cardMap),
        },
        null,
        2
      ),
      'utf-8'
    );
  }

  console.log('Fetching standings...');

  for (let i = 0; i < newTournaments.length; i++) {
    const t = newTournaments[i];

    // Skip tournaments already processed in a previous interrupted run
    if (processedIds.has(t.id)) continue;

    if (i > 0 && i % 50 === 0) {
      const pct = Math.round((i / newTournaments.length) * 100);
      console.log(`  Progress: ${i}/${newTournaments.length} (${pct}%)...`);
    }

    try {
      const standings = await apiFetch(`${BASE_URL}/tournaments/${t.id}/standings`);
      await sleep(REQUEST_DELAY_MS);

      for (const player of standings) {
        if (!player.decklist?.pokemon) continue;

        const seenInThisDecklist = new Set();
        for (const card of player.decklist.pokemon) {
          const cardName = card.name ?? '';
          if (!cardName || seenInThisDecklist.has(cardName)) continue;
          seenInThisDecklist.add(cardName);

          if (!cardMap.has(cardName)) {
            cardMap.set(cardName, {
              count: 0,
              lastSeenDate: t.date,
              set: card.set,
              number: card.number,
            });
          }

          const entry = cardMap.get(cardName);
          entry.count++;

          // Keep the most recent set/number for hyperlink + display
          if (!entry.lastSeenDate || new Date(t.date) > new Date(entry.lastSeenDate)) {
            entry.lastSeenDate = t.date;
            entry.set = card.set;
            entry.number = card.number;
          }
        }
      }

      processedIds.add(t.id);

      if (!newestSuccessDate || new Date(t.date) > new Date(newestSuccessDate)) {
        newestSuccessDate = t.date;
      }
    } catch (err) {
      failedCount++;
      warnings.push(`${t.id} "${t.name}" (${t.date?.slice(0, 10)}): ${err.message}`);
    }

    // Checkpoint every N tournaments — safe to restart if interrupted
    if ((i + 1) % CHECKPOINT_EVERY === 0) {
      saveCheckpoint();
      console.log(`  [checkpoint saved — ${i + 1}/${newTournaments.length}]`);
    }
  }

  if (failedCount > 0) {
    console.warn(
      `\n⚠️  ${failedCount} tournament(s) failed to load standings (see warnings below).`
    );
  }

  // Final save — advance the date cursor and clear processedIds (run complete)
  const updatedData = {
    generatedAt: new Date().toISOString(),
    lastFetchedDate: newestSuccessDate ?? existingData.lastFetchedDate,
    processedIds: [],
    cardMap: Object.fromEntries(cardMap),
  };
  writeFileSync(DATA_JSON, JSON.stringify(updatedData, null, 2), 'utf-8');
  console.log(`\nSaved aggregated data to cards-data.json`);

  // ---------------------------------------------------------------------------
  // Build output: filter → sort by most-recent last-seen → top MAX_CARDS
  // ---------------------------------------------------------------------------
  const qualified = Array.from(cardMap.entries())
    .filter(([, d]) => d.count >= MIN_APPEARANCES)
    .sort((a, b) => new Date(b[1].lastSeenDate) - new Date(a[1].lastSeenDate))
    .slice(0, MAX_CARDS);

  const totalUnique = cardMap.size;
  const totalQualified = Array.from(cardMap.values()).filter(
    (d) => d.count >= MIN_APPEARANCES
  ).length;

  console.log(`\nUnique Pokemon cards seen (all time): ${totalUnique}`);
  console.log(`Cards meeting >= ${MIN_APPEARANCES} appearances : ${totalQualified}`);
  console.log(`Writing top ${qualified.length} most-recently-active to file...`);

  const outputCards = qualified.map(([name, data]) => ({
    id: nameToId(name),
    name,
    hyperlink:
      data.set && data.number
        ? `https://limitlesstcg.com/cards/${data.set}/${data.number}/decklists`
        : '',
    entries: data.count,
    image: [`https://r2.limitlesstcg.net/pokemon/gen9/${nameToImageSlug(name)}.png`],
    type: 'Card',
    set: data.set && data.number ? `${data.set} ${data.number}` : null,
  }));

  const warningBlock =
    warnings.length > 0 ? warnings.map((w) => `// ⚠️  ${w}`).join('\n') + '\n' : '';

  const tsContent =
    `// AUTO-GENERATED by scripts/fetch-cards.mjs — do not edit manually.\n` +
    `// Last updated     : ${new Date().toISOString()}\n` +
    `// New tournaments  : ${newTournaments.length - failedCount} processed, ${failedCount} failed\n` +
    `// All-time cards   : ${totalUnique} unique Pokemon cards seen\n` +
    `// Output           : top ${MAX_CARDS} most recently active, min ${MIN_APPEARANCES} appearances (${qualified.length} qualify)\n` +
    (failedCount > 0
      ? `// ⚠️  WARNING: ${failedCount} tournament(s) failed — counts may be slightly under-reported.\n`
      : '') +
    warningBlock +
    `\nimport type { GameItem } from './types';\n\n` +
    renderGameItemsTs(outputCards);

  writeFileSync(OUTPUT_TS, tsContent, 'utf-8');

  console.log(`\n✅ cards-generated.ts written successfully.\n`);
  console.log(`Top 10 by total appearances:`);
  [...outputCards]
    .sort((a, b) => b.entries - a.entries)
    .slice(0, 10)
    .forEach((c, i) => console.log(`  ${i + 1}. ${c.name}: ${c.entries}`));

  if (failedCount > 0) {
    console.log(`\n⚠️  Partial data warning — failed tournaments:`);
    warnings.forEach((w) => console.log(`  • ${w}`));
    console.log(`\n  Re-running will re-attempt these (they are within the unfetched window).`);
    console.log(`  Or delete cards-data.json and re-run for a full clean backfill.`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
