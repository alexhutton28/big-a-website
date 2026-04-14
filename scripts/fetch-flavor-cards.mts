/**
 * Pokémon TCG Flavor Text Fetcher
 *
 * Fetches cards with flavor text from https://api.pokemontcg.io/v2/cards,
 * normalises each card, deduplicates by name (first occurrence wins), and
 * writes the result to /public/cards.json.
 *
 * Usage:
 *   npm run fetch-flavor-cards
 *   npx tsx scripts/fetch-flavor-cards.mts
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '../src/app/guess-that-flavor-text/flavor-cards.ts');

const API_BASE = 'https://api.pokemontcg.io/v2/cards';
const PAGE_SIZE = 250;
const TOTAL_PAGES = 20;

// ---------------------------------------------------------------------------
// API types (minimal – only fields we use)
// ---------------------------------------------------------------------------

interface ApiAttack {
  name: string;
}

interface ApiCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  types?: string[];
  flavorText?: string;
  attacks?: ApiAttack[];
  set: { name: string };
  images: { small: string; large: string };
}

interface ApiResponse {
  data: ApiCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

interface FlavorCard {
  id: string;
  name: string;
  flavorText: string;
  attack: string | null;
  stage: string | null;
  set: string | null;
  type: string | null;
  image: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAGES = ['Basic', 'Stage 1', 'Stage 2'] as const;

function normaliseCard(card: ApiCard): FlavorCard {
  const stage = card.subtypes?.find((s) => (STAGES as readonly string[]).includes(s)) ?? null;

  let flavorText = card.flavorText ?? '';
  // Always replace the full card name
  flavorText = replaceNameInFlavor(flavorText, card.name);
  // If the card name is a variant (e.g., 'Alolan Sandshrew'), also replace the base species name
  const parts = card.name.split(' ');
  if (parts.length > 1) {
    const baseName = parts[parts.length - 1];
    // Only replace if baseName is not already the full name
    if (baseName.toLowerCase() !== card.name.toLowerCase()) {
      flavorText = replaceNameInFlavor(flavorText, baseName);
    }
  }

  return {
    id: card.id,
    name: card.name,
    flavorText,
    attack: card.attacks?.[0]?.name ?? null,
    stage,
    set: card.set.name,
    type: card.types?.[0] ?? null,
    image: card.images.small,
  };
}

/**
 * Replaces all case-insensitive whole-word occurrences of `name` inside
 * `flavorText` with "this pokemon", capitalised when at the start of a
 * sentence.
 */
function replaceNameInFlavor(flavorText: string, name: string): string {
  // Escape any regex special characters in the name
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');

  let result = flavorText.replace(pattern, (match, offset) => {
    const atSentenceStart = isSentenceStart(flavorText, offset);
    return atSentenceStart ? 'this Pokémon' : 'this Pokémon';
  });

  // Ensure the very start of the text is also capitalised if it begins with
  // the replacement (covers the edge case where offset === 0).
  result = result.replace(/^this pokemon/, 'this Pokémon');

  return result;
}

/**
 * Returns true when the character at `offset` follows a sentence-ending
 * punctuation mark (. ! ?) optionally followed by whitespace/quotes.
 */
function isSentenceStart(text: string, offset: number): boolean {
  if (offset === 0) return true;
  const before = text.slice(0, offset).trimEnd();
  if (before.length === 0) return true;
  const lastChar = before[before.length - 1];
  return lastChar === '.' || lastChar === '!' || lastChar === '?';
}

async function fetchPage(page: number): Promise<ApiCard[]> {
  const url = `${API_BASE}?q=flavorText:*&page=${page}&pageSize=${PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching page ${page}: ${await res.text()}`);
  }
  const body = (await res.json()) as ApiResponse;
  return body.data;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const allCards: ApiCard[] = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    console.log(`Fetching page ${page} / ${TOTAL_PAGES}…`);
    const data = await fetchPage(page);
    console.log(`  → ${data.length} cards received`);
    allCards.push(...data);
    if (data.length < PAGE_SIZE) {
      console.log(`  → Reached last page (received < ${PAGE_SIZE} cards). Stopping early.`);
      break;
    }
  }

  console.log(`\nTotal cards fetched: ${allCards.length}`);

  // Filter to Pokémon cards with flavor text, excluding 'Dark', 'Light', and possessive names
  const valid = allCards.filter((c) => {
    if (c.supertype !== 'Pokémon') return false;
    if (!c.flavorText || c.flavorText.trim().length === 0) return false;
    const name = c.name;
    if (/^(Dark|Light)\s/i.test(name)) return false;
    if (/['’]s\b/i.test(name)) return false;
    return true;
  });
  console.log(`Valid Pokémon cards with flavor text: ${valid.length}`);

  // Deduplicate by name (first occurrence wins)
  const seen = new Map<string, FlavorCard>();
  for (const raw of valid) {
    if (!seen.has(raw.name)) {
      seen.set(raw.name, normaliseCard(raw));
    }
  }

  const dataset = Array.from(seen.values());
  console.log(`Unique Pokémon after deduplication: ${dataset.length}`);

  // Write as a JS module export
  const fileContent = `// AUTO-GENERATED FILE. DO NOT EDIT.\nconst flavorCards = ${JSON.stringify(dataset, null, 2)};\n\nexport default flavorCards;\n`;
  writeFileSync(OUTPUT, fileContent, 'utf-8');
  console.log(`\nWrote ${dataset.length} cards to ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
