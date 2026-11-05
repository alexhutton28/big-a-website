# Page System: Home

> The animated night sky at `/`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 1.0 · November 4, 2026 · Size: small · Scope: `.home-sky`**

## Feel

- Vast but fun. The games are the spotlight, and outer space is essentially white space.

## Color

`night` is also the header on pages without their own header color.

| Name  | Hex       | Semantic roles |
| ----- | --------- | -------------- |
| Night | `#060C18` |                |

The sky's other colors are artwork (see Exceptions in the HuttonDesign System): the gradients and glows in the `.home-*` rules in `globals.css`, and the star and satellite constants at the top of `src/components/NightSky.tsx`.

## Typography

Google Sans Flex for the title and tagline, loaded with `next/font` as `--font-google-sans-flex`. Light weights, fully rounded (`ROND`) and a little wide (`wdth`). See `.home-title` and `.home-subtitle`.

## Motion

| Token              | Value                          |
| ------------------ | ------------------------------ |
| `ease-settle`      | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `duration-lift`    | 350ms                          |
| `duration-zoom`    | 500ms                          |
| `duration-nudge`   | 300ms                          |
| `duration-glow`    | 250ms                          |
| `duration-breathe` | 12s                            |
| `duration-reduced` | 200ms                          |

- Things settle: `ease-settle` is a quick start with a long, soft landing. Game cards lift over `duration-lift`, their images zoom over `duration-zoom`, and social links rise over `duration-nudge` while they glow over `duration-glow`.
- The atmosphere breathes slowly over `duration-breathe`. Stars, shooting stars and satellites are timed by constants at the top of `NightSky.tsx`.
- Reduced motion: no lifts or zooms, and hover keeps a glow over `duration-reduced`. The atmosphere stops, and the sky is a single still frame.

## Components

### Game cards

- On hover and focus they catch starlight instead of casting a shadow: the card lifts slightly and a cool glow blooms around it. No border. See `.home-card`.

### Social links

- White icons near the bottom of the planet, with the same cool glow as the cards. 44px tap targets. See `.home-socials`.

## Changelog

- **November 4, 2026 · v1.0:** Feel and motion added by Alex; motion recorded from the page as it is.
- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
