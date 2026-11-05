# Page System: Limitless Check

> The higher-or-lower game at `/limitless-check`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 1.0 · November 4, 2026 · Size: small · Scope: `.limitless-check-page`**

## Feel

- Fast and arcade-like.
- Competitive and in the know.
- Bold and punchy.

## Color

| Name       | Hex       | Semantic roles | Used for                                                                    |
| ---------- | --------- | -------------- | --------------------------------------------------------------------------- |
| Houndoom   | `#4E0A0A` |                | Header, main button, game-over overlay, strong text and the scrollbar thumb |
| Eevee      | `#6C393A` |                | Body text and hover states                                                  |
| Rockruff   | `#8F6767` |                | Menu toggle, borders and the scrollbar track                                |
| Scizor     | `#C62121` |                | Wrong answer outline                                                        |
| Butterfree | `#F5E6E6` |                | Round card background                                                       |
| Blissey    | `#E08C8C` |                | Round card hover border                                                     |
| Togepi     | `#FAF7F7` |                | Header text, menu toggle and the game-over panel                            |
| Jigglypuff | `#F7EFEF` |                | Not used yet                                                                |
| Bulbasaur  | `#5FAE62` |                | Right answer outline                                                        |

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
