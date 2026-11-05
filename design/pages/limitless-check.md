# Page System: Limitless Check

> The higher-or-lower game at `/limitless-check`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 1.0 · November 4, 2026 · Size: small · Scope: `.limitless-check-page`**

## Feel

- Fast and arcade-like.
- Competitive and in the know.
- Bold and punchy.

## Color

| Name       | Hex       | Semantic roles |
| ---------- | --------- | -------------- |
| Houndoom   | `#4E0A0A` |                |
| Eevee      | `#6C393A` |                |
| Rockruff   | `#8F6767` |                |
| Scizor     | `#C62121` |                |
| Butterfree | `#F5E6E6` |                |
| Blissey    | `#E08C8C` |                |
| Togepi     | `#FAF7F7` |                |
| Jigglypuff | `#F7EFEF` |                |
| Bulbasaur  | `#5FAE62` |                |

## Typography

Lato, the site default.

## Imagery

Paper background: `public/paper-bg.jpg`.

## Motion

| Token              | Value |
| ------------------ | ----- |
| `duration-option`  | 320ms |
| `duration-overlay` | 260ms |
| `duration-panel`   | 300ms |

- Round options enter over `duration-option`. The game-over overlay fades over `duration-overlay` while its panel rises over `duration-panel`.
- Timing set in code stays in named constants in `GameScreen.tsx`: the entry count (`ENTRY_COUNT_DURATION_MS`, 900ms) and the pause after a result (`POST_RESULT_DELAY_MS`, 2000ms).
- Reduced motion: these animations don't respect it yet ([#46](https://github.com/alexhutton28/big-a-website/issues/46)).

## Changelog

- **November 4, 2026 · v1.0:** Feel and motion added by Alex; motion recorded from the page as it is.
- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
