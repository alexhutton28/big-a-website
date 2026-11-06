import type { ComponentProps } from 'react';

// Every tcgTierStack button. The styles are the .tier-stack-button rules in globals.css;
// tabs and tools show as selected from aria-selected and aria-pressed.
const VARIANTS = {
  default: '',
  primary: 'primary',
  tab: 'tier-stack-tab',
  tool: 'tier-stack-tool',
};

type Props = ComponentProps<'button'> & { variant?: keyof typeof VARIANTS };

export default function Button({ variant = 'default', className = '', ...props }: Props) {
  const classes = ['tier-stack-button', VARIANTS[variant], className].filter(Boolean).join(' ');
  return <button {...props} className={classes} />;
}
