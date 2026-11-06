#!/bin/sh
# Regenerates the design tokens from design/*.md with the hutton-design skill, then
# prints its completeness and contrast check. Commit the generated .css files; never
# edit them by hand. --keep-defaults stays until the code stops using Tailwind's
# default utilities.
set -eu

GEN="${HUTTON_DESIGN_GEN:-$HOME/.claude/skills/hutton-design/scripts/gen-tokens.py}"
cd "$(dirname "$0")/.."

python3 -I "$GEN" design/hutton-design-system.md --format tailwind4 --keep-defaults \
  --out design/theme.css

for page in home:.home-sky art-something:.art-page \
  guess-that-flavor-text:.dot-gradient-bg limitless-check:.limitless-check-page; do
  name="${page%%:*}"
  python3 -I "$GEN" "design/pages/$name.md" --format tailwind4 \
    --scope "${page#*:}" --out "design/pages/$name.css"
done

for file in design/hutton-design-system.md design/pages/*.md; do
  echo "== $file"
  python3 -I "$GEN" "$file" --check
done
