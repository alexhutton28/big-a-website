// The saved document: one graphic, kept in localStorage. Plain JSON, separate from
// rendering. Changing its shape means bumping `version` and converting older saves in
// parseSaved; a graphic's own new settings can instead be filled in by its `parse`.

import { typeOf, type Graphic, type GraphicKind } from './graphics';

export type TierStackDoc = { version: 2; graphic: Graphic };

export function newDoc(kind: GraphicKind = 'tier-list'): TierStackDoc {
  return { version: 2, graphic: typeOf(kind).create() };
}

export function parseSaved(value: unknown): TierStackDoc | null {
  const saved = value as { version?: number; graphic?: { kind?: string } } | null;
  // Version 1 was a tier list on its own: { version: 1, kind: 'tier-list', ...the list }
  const graphic = saved?.version === 1 ? saved : saved?.version === 2 ? saved.graphic : null;
  const kind = (graphic as { kind?: string } | null | undefined)?.kind;
  const type = kind ? typeOf(kind as GraphicKind) : undefined;
  const parsed = type?.parse(graphic);
  return parsed ? { version: 2, graphic: parsed } : null;
}
