# The HuttonDesign System: Big A's Website

> **You are reading `hutton-design-system.md`, "The HuttonDesign System."**
> This is what every page of big-a.fun shares. Each page's own look (feel, color, fonts, motion, components) is in its Page System in `design/pages/`, and that wins on that page.
>
> How to build with it is in the `hutton-design` skill's `hutton-design-rules.md`.

This system records the site as it is today. Where the code differs, it is tracked in the issues under Known gaps and changes when that work is done: existing code is not rewritten to match.

**Version 1.0 · November 4, 2026 · Design owner: Alex Hutton · Size: small**

| Look                   | Page System                              | Route                     |
| ---------------------- | ---------------------------------------- | ------------------------- |
| Home                   | `design/pages/home.md`                   | `/`                       |
| Art Something          | `design/pages/art-something.md`          | `/art-something`          |
| Guess That Flavor Text | `design/pages/guess-that-flavor-text.md` | `/guess-that-flavor-text` |
| Limitless Check        | `design/pages/limitless-check.md`        | `/limitless-check`        |
| tcgTierStack           | `design/pages/tcg-tier-stack.md`         | `/tcg-tier-stack`         |

## 1. Rule tiers

**Locked (never change)**

- Logos: the files in `public/` are used as they are, never redrawn or recolored.
- Each page's fonts.
- Each page's palette. New colors need Alex's approval.

**Standard (follow as written)**
Spacing scale, breakpoints and each page's motion.

**Open (can grow)**
Semantic tokens that map onto existing palette colors and spacing steps, recorded in the Changelog.

## 2. Principles

- Alex is a designer, so the craft and design of each game takes the spotlight.
- Make unique games and designs that stand apart from the AI-generated sites popping up online.
- Craft is in the details: motion, shadows, timing and type all get real care.
- Every page is its own world. Pages share spacing and breakpoints, not colors or fonts, and values do not move between pages.
- Color is used by name through tokens (`bg-mahogany`, `var(--color-night)`), not raw hex.

## 3. Color

Palettes belong to pages, so this system has none of its own. Each page's palette is named in its Page System. Names are unique across the site because they all share one Tailwind theme.

The default page colors are `--background` and `--foreground` in `src/app/globals.css`.

## 4. Typography

Fonts are loaded with `next/font`: `src/app/layout.tsx` for shared fonts, a route's own `layout.tsx` for a font only that route uses. Each page's font is named in its Page System. The next/font variables are not generated, because next/font sets them.

There is no shared type scale yet ([#43](https://github.com/alexhutton28/big-a-website/issues/43)).

## 5. Spacing

Seven steps, from 2px to 128px, the HuttonDesign default. Tailwind's numbered spacing utilities use these values, so `p-4` is 16px.

| Token     | Value |
| --------- | ----- |
| `space-1` | 2px   |
| `space-2` | 4px   |
| `space-3` | 8px   |
| `space-4` | 16px  |
| `space-5` | 32px  |
| `space-6` | 64px  |
| `space-7` | 128px |

- Padding, margins, gaps and offsets use a step, in classes (`gap-3`) and in CSS (`var(--spacing-3)`). A size between steps rounds to the nearest one; there are no arbitrary spacing values such as `mt-[12px]`.
- Widths and heights are component sizes, not spacing, and use raw values (`w-[260px]`).
- An offset that has to equal a component size stays raw, such as the Guess That Flavor Text autocomplete at `top-[52px]`, under the 52px input.
- Shadow offsets and animation distances belong to the shadow or the motion, not the spacing scale.

## 6. Border radius

No tokens yet ([#43](https://github.com/alexhutton28/big-a-website/issues/43)). Pages use Tailwind's default `rounded` utilities.

## 7. Iconography

- Icons and logos are SVGs in `public/`, with no icon library.

## 8. Logo

- Each game has its own logo in the header, in `src/components/Header.tsx`. Files are in `public/`.

## 9. Imagery and visuals

- Share images and home cards use one file per game, `public/<game>-og.png`: 1200×630, exported from Figma at 1x. The home card crops about 2.5% off each side.
- Favicon: `src/app/icon.png` (512×512). Each game also has its own `icon.png`.

## 10. Interaction behavior

### Hover

- Tailwind's `hover:` variant applies only on devices that can hover.
- Hover that must work everywhere uses plain `:hover` in CSS. See Exceptions.

### Focus

- There is no shared focus ring yet ([#47](https://github.com/alexhutton28/big-a-website/issues/47)). Each page handles focus itself.

## 11. Motion

Motion is defined per page, recorded from what each page does. See each Page System.

- Every animation respects `prefers-reduced-motion`.
- New animations and visual options start as a side-by-side demo of a few variants in the page's palette. The chosen one is then built into the page.

## 12. Responsive behavior

### Breakpoints

Code uses Tailwind's `sm` and `md`, which are the same widths as `b6` and `b7`. New code uses the `b` names. The rest of the grid is available but unused.

| Breakpoint | Name          | Width  | Purpose                                            |
| ---------- | ------------- | ------ | -------------------------------------------------- |
| `b3`       | Phone         | 384px  | Standard and larger phones                         |
| `b5`       | Large phone   | 512px  | Large phones                                       |
| `b6`       | Small tablet  | 640px  | Same as `sm`                                       |
| `b7`       | Tablet        | 768px  | Same as `md`. The main layout change on most pages |
| `b8`       | Large tablet  | 896px  | Large tablets and narrow windows                   |
| `b10`      | Desktop       | 1024px | Standard desktop                                   |
| `b11`      | Laptop        | 1152px | Small laptops                                      |
| `b12`      | Wide          | 1280px | Larger displays                                    |
| `b14`      | Large desktop | 1408px | Large desktop displays                             |
| `b15`      | Extra wide    | 1536px | Very large displays                                |

### Layout

- `html` and `body` do not scroll. Each page gives itself a scroll container.
- Each page's body background is set with `body:has(.page-class)` in `globals.css`, so it fills behind mobile browser toolbars.
- The sticky header (`src/components/Header.tsx`) tints the iOS status bar. Respect `env(safe-area-inset-*)`.

## 13. Components

Shared components are in `src/components/`. Everything else belongs to a page.

### Header

- Sticky, colored per page. Hidden on the home page, which has its own title.

## 14. Exceptions

Places where the token rules do not apply. Keep raw values in named constants, matching a palette color when one exists.

| Where                                                                                                                                         | Allowed                                  | Why                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Canvas drawing: Konva boards, `NightSky`, the Art Something canvas                                                                            | Named color and size constants           | Canvas drawing does not take CSS variables, and exported images must match the screen |
| User-chosen colors, including saved board colors                                                                                              | Any value                                | They belong to the user's content, not the design system                              |
| Exported images                                                                                                                               | Values the artwork needs                 | They are images, not interface                                                        |
| `themeColor` in route metadata                                                                                                                | Hex matching the page's header token     | Browsers read it as a plain value                                                     |
| Home sky artwork: the navy gradient stops, planet and glow colors in the `.home-*` rules, and the star and satellite colors in `NightSky.tsx` | Raw colors, kept out of the Home palette | They are artwork built in code, not interface colors                                  |
| `.home-card` and `.home-socials` hover                                                                                                        | Plain `:hover` on all devices            | The hover glow is part of the home page's look                                        |
| The `.home-title` font size                                                                                                                   | `clamp()`                                | The wide title has to keep its side margins on narrow phones                          |

## 15. Known gaps

- [#37](https://github.com/alexhutton28/big-a-website/issues/37): raw colors that are not covered by Exceptions
- [#43](https://github.com/alexhutton28/big-a-website/issues/43): type and radius tokens
- [#44](https://github.com/alexhutton28/big-a-website/issues/44): desktop-first rules in Art Something
- [#46](https://github.com/alexhutton28/big-a-website/issues/46): animations that don't respect reduced motion yet
- [#47](https://github.com/alexhutton28/big-a-website/issues/47): a shared focus ring
- [#48](https://github.com/alexhutton28/big-a-website/issues/48): Limitless Check's off-grid breakpoints

## 16. Changelog

- **November 5, 2026 · v1.1:** Spacing moves to the seven-step HuttonDesign default (2px to 128px). Every step number moves up by one ([#41](https://github.com/alexhutton28/big-a-website/issues/41)). Arbitrary spacing values are replaced with the nearest step, and the spacing rules are recorded ([#42](https://github.com/alexhutton28/big-a-website/issues/42)).
- **November 4, 2026 · v1.0:** Philosophy and locked rules added by Alex. Motion recorded on every page. Approved by Alex.
- **November 4, 2026 · v0.1:** Initial draft, recorded from the site as it is.
