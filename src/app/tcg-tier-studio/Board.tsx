'use client';

import type Konva from 'konva';
import React from 'react';
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text } from 'react-konva';
import { loadImage } from './cards';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CARD_HEIGHT,
  CARD_WIDTH,
  LABEL_WIDTH,
  SEPARATOR_COLOR,
  SEPARATOR_WIDTH,
  TIER_HEIGHT,
  dropTarget,
  layoutCards,
  moveCard,
  type CardItem,
  type TierListDoc,
} from './tierList';

// The tier list on a Konva canvas, drawn at design size and scaled to fit the editor.
// Konva is browser-only, so TierStudio loads this with ssr: false.

type Props = {
  doc: TierListDoc;
  scale: number;
  fontFamily: string;
  selectedId: string | null;
  onChange: (doc: TierListDoc) => void;
  onSelect: (id: string | null) => void;
  onEditTier: (index: number) => void;
  onStage: (stage: Konva.Stage | null) => void;
};

export default function Board({
  doc,
  scale,
  fontFamily,
  selectedId,
  onChange,
  onSelect,
  onEditTier,
  onStage,
}: Props) {
  const placements = layoutCards(doc);

  return (
    <Stage
      ref={onStage}
      width={BOARD_WIDTH * scale}
      height={BOARD_HEIGHT * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage() || e.target.name() === 'background') onSelect(null);
      }}
    >
      <Layer>
        <Rect name="background" width={BOARD_WIDTH} height={BOARD_HEIGHT} fill={doc.background} />
        {doc.tiers.map((tier, i) => (
          <TierLabel
            key={tier.id}
            name={tier.name}
            color={tier.color}
            y={i * TIER_HEIGHT}
            fontFamily={fontFamily}
            onEdit={() => onEditTier(i)}
          />
        ))}
        {doc.tiers.slice(1).map((tier, i) => (
          <Rect
            key={tier.id}
            y={(i + 1) * TIER_HEIGHT - SEPARATOR_WIDTH / 2}
            width={BOARD_WIDTH}
            height={SEPARATOR_WIDTH}
            fill={SEPARATOR_COLOR}
            listening={false}
          />
        ))}
        {placements.map(({ item, x, y }) => (
          <Card
            key={item.id}
            item={item}
            x={x}
            y={y}
            onSelect={() => onSelect(item.id)}
            onDrop={(centerX, centerY) => {
              const target = dropTarget(doc, item.id, centerX, centerY);
              onChange(moveCard(doc, item.id, target.tierIndex, target.index));
            }}
          />
        ))}
      </Layer>
      {/* Editor-only layer: hidden while exporting */}
      <Layer name="editor" listening={false}>
        {placements
          .filter((p) => p.item.id === selectedId)
          .map((p) => (
            <Rect
              key={p.item.id}
              x={p.x - 3}
              y={p.y - 3}
              width={CARD_WIDTH + 6}
              height={CARD_HEIGHT + 6}
              stroke="#ffffff"
              strokeWidth={3}
              cornerRadius={8}
            />
          ))}
      </Layer>
    </Stage>
  );
}

const LABEL_PADDING = 6;
// Inter Black
const LABEL_FONT_SIZE = 30;
const LABEL_FONT_WEIGHT = '900';
const LABEL_STROKE = LABEL_FONT_SIZE / 6;

let measureContext: CanvasRenderingContext2D | null = null;

// Wraps a label at spaces to fit its box. Words are never split: a word too long for
// the box gets a line to itself and overflows evenly on both sides. (Konva's own word
// wrap splits words that don't fit, e.g. "Commen" / "t".)
function wrapLabel(name: string, fontFamily: string) {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return name;
  const ctx = measureContext;
  ctx.font = `${LABEL_FONT_WEIGHT} ${LABEL_FONT_SIZE}px ${fontFamily}`;
  // The outline adds half its width on each side
  const maxWidth = LABEL_WIDTH - LABEL_PADDING * 2 - LABEL_STROKE;
  return name
    .split('\n')
    .map((paragraph) => {
      const lines: string[] = [];
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const last = lines.at(-1);
        if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= maxWidth) {
          lines[lines.length - 1] = `${last} ${word}`;
        } else {
          lines.push(word);
        }
      }
      return lines.join('\n');
    })
    .join('\n');
}

function TierLabel({
  name,
  color,
  y,
  fontFamily,
  onEdit,
}: {
  name: string;
  color: string;
  y: number;
  fontFamily: string;
  onEdit: () => void;
}) {
  const text = React.useMemo(() => wrapLabel(name, fontFamily), [name, fontFamily]);
  return (
    <Group y={y} onDblClick={onEdit} onDblTap={onEdit}>
      <Rect width={LABEL_WIDTH} height={TIER_HEIGHT} fill={color} />
      <Text
        text={text}
        width={LABEL_WIDTH}
        height={TIER_HEIGHT}
        align="center"
        verticalAlign="middle"
        wrap="none"
        lineHeight={1}
        fontFamily={fontFamily}
        fontStyle={LABEL_FONT_WEIGHT}
        fontSize={LABEL_FONT_SIZE}
        fill="#ffffff"
        stroke="#1b1b1b"
        strokeWidth={LABEL_STROKE}
        fillAfterStrokeEnabled
        lineJoin="round"
      />
    </Group>
  );
}

// Crop for drawing an image at the card's shape without stretching it
function coverCrop(img: HTMLImageElement) {
  const target = CARD_WIDTH / CARD_HEIGHT;
  const ratio = img.width / img.height;
  if (ratio > target) {
    const width = img.height * target;
    return { x: (img.width - width) / 2, y: 0, width, height: img.height };
  }
  const height = img.width / target;
  return { x: 0, y: (img.height - height) / 2, width: img.width, height };
}

function Card({
  item,
  x,
  y,
  onSelect,
  onDrop,
}: {
  item: CardItem;
  x: number;
  y: number;
  onSelect: () => void;
  onDrop: (centerX: number, centerY: number) => void;
}) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = React.useState(false);
  const zIndex = React.useRef(0);

  React.useEffect(() => {
    let current = true;
    loadImage(item.image).then(
      (img) => current && setImage(img),
      () => current && setFailed(true)
    );
    return () => {
      current = false;
    };
  }, [item.image]);

  return (
    <Group
      x={x}
      y={y}
      draggable
      onMouseDown={onSelect}
      onTap={onSelect}
      // Above everything while dragging, then back in order (later cards overlap earlier)
      onDragStart={(e) => {
        zIndex.current = e.target.zIndex();
        e.target.moveToTop();
      }}
      onDragEnd={(e) => {
        const node = e.target;
        onDrop(node.x() + CARD_WIDTH / 2, node.y() + CARD_HEIGHT / 2);
        // Back to its laid-out spot; the new layout moves it if the drop changed it
        node.position({ x, y });
        node.zIndex(zIndex.current);
      }}
    >
      {image ? (
        <KonvaImage image={image} crop={coverCrop(image)} width={CARD_WIDTH} height={CARD_HEIGHT} />
      ) : (
        <>
          <Rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="#2c4e5e" cornerRadius={6} />
          <Text
            text={failed ? `${item.name}\n(no image)` : item.name}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            padding={6}
            align="center"
            verticalAlign="middle"
            fontSize={13}
            fill="#ffffff"
          />
        </>
      )}
    </Group>
  );
}
