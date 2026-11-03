'use client';

import { Layer, Rect } from 'react-konva';
import CardNode from '../../canvas/CardNode';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../canvas/size';
import type { CanvasProps } from '../types';
import { moveCard, type BlankCanvas } from './model';

// The blank canvas: a background and freely placed cards. Cards are dragged anywhere on
// the board.

export default function BlankCanvasView({
  graphic: canvas,
  onChange,
  onSelect,
  onCardMenu,
}: CanvasProps<BlankCanvas>) {
  return (
    <Layer>
      <Rect name="background" width={BOARD_WIDTH} height={BOARD_HEIGHT} fill={canvas.background} />
      {canvas.items.map((item) => (
        <CardNode
          key={item.id}
          item={item}
          x={item.x}
          y={item.y}
          borderColor={item.split ? canvas.border : null}
          dividerColor={canvas.border}
          onSelect={() => onSelect(item.id)}
          onMenu={(menuX, menuY) => onCardMenu(item.id, menuX, menuY)}
          onDragEnd={(x, y) => onChange(moveCard(canvas, item.id, x, y))}
        />
      ))}
    </Layer>
  );
}
