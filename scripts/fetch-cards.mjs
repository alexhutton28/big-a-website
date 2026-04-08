/**
 * Limitless TCG Card Fetcher
 *
 * Fetches PTCG tournament standings from the Play Limitless API
 * (https://play.limitlesstcg.com/api) and aggregates Pokemon card appearance
 * counts. Each card scores +1 per unique decklist it appears in, regardless of
 * how many copies are included.
 *
 * IMPORTANT DATA-SOURCE NOTE:
 * This script only sees tournaments that exist in the Play Limitless platform
 * dataset. It does NOT include any major in-person events listed on
 * https://limitlesstcg.com/tournaments
 *
 * Output: up to 500 most-recently-active cards with >= 100 entries.
 *
 * Rolling-window mode: each run rebuilds counts from scratch using only
 * tournaments in the last 30 days. This keeps counts accurate for a moving
 * 30-day view (for example: 300 -> 200 as older usage drops out of window).
 *
 * cards-data.json is used for checkpoint/resume safety during interrupted
 * runs, not for long-term cumulative totals.
 *
 * Usage:
 *   npm run fetch-cards            — rebuild current 30-day snapshot
 *   node scripts/fetch-cards.mjs  — same
 *
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_TS = join(__dirname, '../src/app/limitless-check/cards-generated.ts');
const DATA_JSON = join(__dirname, '../src/app/limitless-check/cards-data.json');

const BASE_URL = 'https://play.limitlesstcg.com/api';
const MIN_APPEARANCES = 100; // include only cards with strong representation
const MAX_CARDS = 500;
const TOURNAMENT_LIMIT = 200; // max per page (API maximum)
const REQUEST_DELAY_MS = 600; // ms between standings fetches (stay under rate limit)
const PAGE_DELAY_MS = 300; // ms between tournament list pages
const LOOKBACK_DAYS = 30; // rolling history window
const CHECKPOINT_EVERY = 50; // save progress to disk every N tournaments
const MIN_PLAYERS = 50; // ignore small events

function isEligibleTournament(tournament) {
  if (tournament.players < MIN_PLAYERS) return false;
  return tournament.format === 'STANDARD';
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteTsString(value) {
  const normalized = String(value).replace(/\\/g, '\\\\');

  // Prefer single quotes, but switch to double quotes when apostrophes appear
  // so names like "Hop's Snorlax" stay readable.
  if (normalized.includes("'")) {
    return `"${normalized.replace(/\"/g, '\\\"')}"`;
  }

  return `'${normalized.replace(/'/g, "\\'")}'`;
}

function renderGameItemTs(item) {
  const setValue = item.set === null ? 'null' : quoteTsString(item.set);
  const setsValue = `[${(item.sets ?? []).map(quoteTsString).join(', ')}]`;
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
    `    sets: ${setsValue},`,
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
// Tournament list fetcher from the Play API
// (paginated, stops once events fall outside the lookback window)
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

    // API returns newest-first; once a date is <= sinceDate, we've crossed
    // the lookback boundary and can stop paging.
    let hitOld = false;
    for (const t of data) {
      if (sinceDate && new Date(t.date) <= new Date(sinceDate)) {
        hitOld = true;
        break;
      }
      if (isEligibleTournament(t)) tournaments.push(t);
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

  // Ogerpon masks use distinct art slugs except Teal Mask, which stays plain `ogerpon`.
  if (/^Wellspring Mask Ogerpon/i.test(n)) return 'ogerpon-wellspring';
  if (/^Hearthflame Mask Ogerpon/i.test(n)) return 'ogerpon-hearthflame';
  if (/^Cornerstone Mask Ogerpon/i.test(n)) return 'ogerpon-cornerstone';
  n = n.replace(/^Teal Mask\s+/i, '');

  // Bloodmoon Ursaluna art slug is ordered as "ursaluna-bloodmoon".
  if (/^Bloodmoon\s+Ursaluna/i.test(n)) return 'ursaluna-bloodmoon';

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
  console.log('Data source: play.limitlesstcg.com/api (platform-hosted tournaments only)');
  console.log('Note: this may exclude some majors listed on limitlesstcg.com/tournaments.\n');

  // Load existing data (used for checkpoint resume metadata)
  let existingData = { generatedAt: null, lastFetchedDate: null, cardMap: {} };
  try {
    const raw = readFileSync(DATA_JSON, 'utf-8');
    existingData = JSON.parse(raw);
    console.log(`Loaded existing data from cards-data.json`);
    console.log(`  Last fetched : ${existingData.lastFetchedDate}`);
    console.log(`  Known cards  : ${Object.keys(existingData.cardMap).length}\n`);
  } catch {
    console.log('No existing cards-data.json found — starting fresh rolling-window fetch.\n');
  }

  // Always use a rolling 30-day window for tournament selection
  const defaultSince = new Date();
  defaultSince.setDate(defaultSince.getDate() - LOOKBACK_DAYS);
  const fetchSince = defaultSince.toISOString();

  console.log(
    `Fetching STANDARD tournaments from the last ${LOOKBACK_DAYS} days (since ${defaultSince.toISOString().slice(0, 10)})...`
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

  // Only restore the cardMap when resuming an interrupted run (processedIds non-empty).
  // For a normal fresh run we always start empty so counts reflect only the current
  // 30-day window — not accumulated totals from previous runs.
  const processedIds = new Set(existingData.processedIds ?? []);
  const isResume = processedIds.size > 0;
  const cardMap = isResume
    ? new Map(
        Object.entries(existingData.cardMap).map(([name, data]) => {
          const hydrated = { ...data };
          if (!Array.isArray(hydrated.sets)) hydrated.sets = [];
          if (hydrated.set && hydrated.number) {
            const latestSet = `${hydrated.set} ${hydrated.number}`;
            if (!hydrated.sets.includes(latestSet)) hydrated.sets.push(latestSet);
          }
          return [name, hydrated];
        })
      )
    : new Map();
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
              sets: [],
            });
          }

          const entry = cardMap.get(cardName);
          entry.count++;

          // Track all unique observed set+number variants for this card name.
          if (!Array.isArray(entry.sets)) entry.sets = [];
          if (card.set && card.number) {
            const setLabel = `${card.set} ${card.number}`;
            if (!entry.sets.includes(setLabel)) entry.sets.push(setLabel);
          }

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
      data.set && data.number ? `https://limitlesstcg.com/cards/${data.set}/${data.number}` : '',
    entries: data.count,
    image: [`https://r2.limitlesstcg.net/pokemon/gen9/${nameToImageSlug(name)}.png`],
    type: 'Card',
    set: data.set && data.number ? `${data.set} ${data.number}` : null,
    sets: Array.isArray(data.sets)
      ? data.sets
      : data.set && data.number
        ? [`${data.set} ${data.number}`]
        : [],
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
    console.log(`\n  Re-running will re-attempt these tournaments within the 30-day window.`);
    console.log(
      `  If needed, delete cards-data.json and re-run for a fresh rolling-window rebuild.`
    );
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
