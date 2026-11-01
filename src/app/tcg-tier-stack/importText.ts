// Bulk import format. A `#` line starts the next tier and renames it (`#` alone keeps
// the name; `\n` is a line break). Each other line is a card, in deck-list form with an
// optional count:
//
//   # EZ Dub
//   Mew ex MEW 151
//   1 Dipplin TWM 18
//   Alakazam            <- name only: the newest regular print
//
// Cards before the first `#` go in the first tier.

import { TIER_COUNT } from './tierList';

export type ImportLine = { name: string; set?: string; number?: string; line: number };
export type ImportTier = { name?: string; cards: ImportLine[] };

const WITH_SET = /^(.+?)\s+([A-Z][A-Z0-9-]{1,7})\s+([A-Za-z0-9-]{1,8})$/;

export function parseImport(text: string): { tiers: ImportTier[]; errors: string[] } {
  const tiers: ImportTier[] = [{ cards: [] }];
  const errors: string[] = [];
  let started = false;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith('#')) {
      if (started || tiers[0].cards.length > 0) tiers.push({ cards: [] });
      started = true;
      const name = line.slice(1).trim().replaceAll('\\n', '\n');
      if (name) tiers[tiers.length - 1].name = name;
      return;
    }
    const card = line.replace(/^\d+\s+/, '');
    const match = card.match(WITH_SET);
    tiers[tiers.length - 1].cards.push(
      match
        ? { name: match[1], set: match[2], number: match[3], line: i + 1 }
        : { name: card, line: i + 1 }
    );
  });

  if (tiers.length > TIER_COUNT) {
    errors.push(`Only ${TIER_COUNT} tiers: the extra tiers were left out.`);
  }
  return { tiers: tiers.slice(0, TIER_COUNT), errors };
}
