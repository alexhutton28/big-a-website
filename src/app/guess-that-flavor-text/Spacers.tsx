// Flexible spacers that sit above and below a screen's content in a flex column.
// With some free space the content looks centered, slightly high (the bottom one grows
// a bit more); on tall screens the top one stops at 200px so the content stays in the
// upper part of the page instead of sinking. With no free space both shrink to nothing.

export function TopSpacer() {
  return <div aria-hidden="true" className="flex-1 max-h-[200px]" />;
}

export function BottomSpacer() {
  return <div aria-hidden="true" className="flex-[1.3]" />;
}
