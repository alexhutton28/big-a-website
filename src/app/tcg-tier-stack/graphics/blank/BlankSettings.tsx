'use client';

import ColorField from '../../ui/ColorField';
import type { SettingsProps } from '../types';
import type { BlankCanvas } from './model';

// The blank canvas's part of Customize Board: background, and split cards' border

export default function BlankSettings({ graphic: canvas, onChange }: SettingsProps<BlankCanvas>) {
  return (
    <>
      <h3 className="font-bold">Background</h3>
      <ColorField
        label="Background color"
        value={canvas.background}
        onChange={(background) => onChange((c) => ({ ...c, background }))}
      />
      <h3 className="font-bold">Split card border</h3>
      <ColorField
        label="Split card border color"
        value={canvas.border}
        onChange={(border) => onChange((c) => ({ ...c, border }))}
      />
    </>
  );
}
