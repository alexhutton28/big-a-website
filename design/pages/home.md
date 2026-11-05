# Page System: Home

> The animated night sky at `/`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 0.1 · November 4, 2026 · Size: small · Scope: `.home-sky`**

## Feel

- {{How this page should feel: to be written by Alex}}

## Color

`night` is also the header on pages without their own header color.

| Name  | Hex       | Semantic roles |
| ----- | --------- | -------------- |
| Night | `#060C18` |                |

The sky's other colors are artwork (see Exceptions in the HuttonDesign System): the gradients and glows in the `.home-*` rules in `globals.css`, and the star and satellite constants at the top of `src/components/NightSky.tsx`.

## Typography

Google Sans Flex for the title and tagline, loaded with `next/font` as `--font-google-sans-flex`. Light weights, fully rounded (`ROND`) and a little wide (`wdth`). See `.home-title` and `.home-subtitle`.

## Motion

Not defined for this project.

The page has motion but no shared tokens yet. What exists: the starfield in `NightSky.tsx`, the breathing atmosphere, and the card and social link hover lifts, which respect reduced motion.

## Components

### Game cards

- On hover and focus they catch starlight instead of casting a shadow: the card lifts slightly and a cool glow blooms around it. No border. See `.home-card`.

### Social links

- White icons near the bottom of the planet, with the same cool glow as the cards. 44px tap targets. See `.home-socials`.

## Changelog

- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
