# tcgTierStack

A hidden tool (not linked from the home page, `noindex`) for laying out Pokémon TCG tier
lists and exporting them as images for X. It's meant to grow into a small design tool
(more chart types, free-placed elements), so the document is plain JSON kept separate
from rendering. Styling is deliberately minimal for now.

## Files

- `tierList.ts`: the document type, defaults, all board sizes, and the layout (`layoutCards`, `tierGap`, `dropTarget`, `moveCard`).
- `Board.tsx`: draws the document with react-konva (canvas): tier labels, cards, dragging, selection. Clicking a card without dragging (Konva's `click`/`tap` don't fire after a drag) calls `onCardMenu`; `TierStack` shows the card menu (HTML, over the board) there. "Make split card" is a disabled placeholder.
- Don't use `confirm()`/`alert()`: the in-app test browser never shows them (`confirm` returns false at once). Confirm on the page instead (see New board).
- `TierStack.tsx`: editor state and the control panel: import, card search, export, save/load. Search results can be clicked (add to the chosen tier, or swap the selected card's print) or dragged onto the board (HTML drag and drop on the board's wrapper, placed with `dropTarget` and `insertCard`; no touch support).
- `TierStackLoader.tsx`: loads the studio with `ssr: false` (Konva needs a browser canvas).
- `importText.ts`: the bulk import format (documented at the top of the file). Import adds cards after the ones already in each tier (cards past 12 are left out and reported); it never clears the board.
- `cards.ts`: client calls to the API routes, and image loading through the proxy.
- `../api/tcg-tier-stack/`: `card` (by set + number), `search` (by name), `image` (proxy), and `limitless.ts`, which reads limitlesstcg.com pages.

## Things to know

- Board is 1200×675; export is 2× (2400×1350 PNG). Always 4 tiers, at most 12 cards per tier. Cards are 100×140 with a 25px gap that shrinks (negative overlaps, later cards on top) once a row is full; 8 fit at the default gap.
- Every image is loaded through `/api/tcg-tier-stack/image`: Limitless sends no CORS headers, and a canvas with cross-origin images can't be exported. The proxy only allows the hosts listed in its route; add a host there to use a new image source (e.g. Pokémon HOME sprites).
- Limitless has no card API, so lookups read its pages. Image numbers aren't predictable (MEG pads to 3 digits, TWM doesn't), so image URLs always come from the page. Search uses `show=all` to get every match on one page (default is 50 per page); results whose images aren't on the Limitless CDN (older cards on pokemontcg.io) are skipped. Search results are newest set first; a name-only import picks the lowest number in the newest set.
- The editor-only layer (selection outline) is named `editor` and hidden while exporting.
- Canvas text needs the font loaded first: tier labels are Inter Black (900) at 30px, loaded with `next/font` in `layout.tsx` (`--font-inter`) and then `document.fonts.load` before they draw. Names wrap at spaces in `wrapLabel`, never mid-word (Konva's own wrap splits words that don't fit).
- Colors are edited with `ColorField`: a hex text field plus the browser's picker.
- The document autosaves to `localStorage` (`tcg-tier-stack-doc`) and is read back with `parseDoc`; there's no file save/load. Changing the shape means bumping `version`; a new setting with a default can instead be filled in by `parseDoc` for older saves (as `border` and `tierCardBorders` are).
- Board settings: `background`, `border` (the lines between tiers) and `tierCardBorders` (a 3px stroke inside each card in its tier's color, following the card images' ~4.5px rounded corners).
- The Customize Board (tiers and background) and Bulk import panels are `<details>`, collapsed by default; double-clicking a tier label opens Customize Board and focuses that name. Tier names are one-line inputs; `\n` typed there is a line break, as in bulk import. There's no help text in the panel for now.
