'use client';

import type Konva from 'konva';
import React from 'react';
import Board from './Board';
import ColorField from './ColorField';
import { fetchCard, loadImage, mapLimit, proxied, searchCards, type CardResult } from './cards';
import { parseImport, type ImportLine } from './importText';
import {
  BOARD_WIDTH,
  EXPORT_SCALE,
  MAX_CARDS_PER_TIER,
  defaultDoc,
  dropTarget,
  insertCard,
  newId,
  parseDoc,
  type CardItem,
  type TierListDoc,
} from './tierList';

// The tier list editor: the board plus a plain control panel. Kept deliberately
// unstyled; it's a tool for making images, not a page people visit.

const STORAGE_KEY = 'tcg-tier-stack-doc';

function loadSaved() {
  try {
    return parseDoc(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) ?? defaultDoc();
  } catch {
    return defaultDoc();
  }
}

async function resolveCard(line: ImportLine): Promise<CardItem | null> {
  if (line.set && line.number) {
    const card = await fetchCard(line.set, line.number);
    if (card) return toItem(card, card.name ?? line.name);
  }
  const results = await searchCards(line.name);
  const pick = defaultPrint(results);
  return pick ? toItem(pick, line.name) : null;
}

// Search results come newest set first. Within a set, alt arts are numbered after the
// regular card, so the lowest number in the newest set is its usual print.
function defaultPrint(results: CardResult[]) {
  const newest = results.filter((r) => r.set === results[0]?.set);
  const number = (r: CardResult) => parseInt(r.number, 10) || Infinity;
  return newest.sort((a, b) => number(a) - number(b))[0];
}

function toItem(card: CardResult, name: string): CardItem {
  return { id: newId(), kind: 'card', name, set: card.set, number: card.number, image: card.image };
}

const button = 'border border-black px-[8px] py-[2px] bg-white disabled:opacity-50';

export default function TierStack() {
  const [doc, setDoc] = React.useState<TierListDoc>(loadSaved);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [scale, setScale] = React.useState(1);
  const [fontFamily, setFontFamily] = React.useState('sans-serif');
  const [status, setStatus] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<CardResult[]>([]);
  const [targetTier, setTargetTier] = React.useState(0);
  const [confirmingNew, setConfirmingNew] = React.useState(false);
  // Menu for a clicked card, positioned in the board's on-screen pixels
  const [cardMenu, setCardMenu] = React.useState<{ id: string; x: number; y: number } | null>(null);
  const cardMenuRef = React.useRef<HTMLDivElement>(null);
  // Card being replaced: the next search result clicked takes its place
  const [replacingId, setReplacingId] = React.useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const stageRef = React.useRef<Konva.Stage | null>(null);
  const boardBoxRef = React.useRef<HTMLDivElement>(null);
  const tierNameRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const tiersPanelRef = React.useRef<HTMLDetailsElement>(null);
  // Search result being dragged onto the board
  const draggedResult = React.useRef<CardResult | null>(null);

  // Autosave
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {}
  }, [doc]);

  // Board scales down to fit narrow windows; exports are always full size
  React.useEffect(() => {
    const fit = () => {
      const width = boardBoxRef.current?.clientWidth ?? BOARD_WIDTH;
      setScale(Math.min(1, width / BOARD_WIDTH));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Canvas text needs the font loaded first; next/font gives it a generated family name,
  // set on the studio's layout
  React.useEffect(() => {
    const box = boardBoxRef.current;
    const family = box && getComputedStyle(box).getPropertyValue('--font-inter').trim();
    if (!family) return;
    document.fonts.load(`900 30px ${family}`).then(() => setFontFamily(family));
  }, []);

  const removeCard = React.useCallback((id: string) => {
    setDoc((d) => ({
      ...d,
      tiers: d.tiers.map((t) => ({ ...t, items: t.items.filter((i) => i.id !== id) })),
    }));
    setSelectedId((selected) => (selected === id ? null : selected));
  }, []);

  const removeSelected = React.useCallback(() => {
    if (!selectedId) return;
    removeCard(selectedId);
  }, [selectedId, removeCard]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest('input, textarea, select');
      if (!typing && (e.key === 'Delete' || e.key === 'Backspace')) removeSelected();
      if (e.key === 'Escape') {
        setCardMenu(null);
        setReplacingId(null);
      }
      if (!typing && e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeSelected]);

  // The card menu closes on any press outside it (a press on a card reopens it on click)
  React.useEffect(() => {
    if (!cardMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node && cardMenuRef.current?.contains(e.target))) setCardMenu(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [cardMenu]);

  const updateTier = (index: number, change: Partial<TierListDoc['tiers'][number]>) =>
    setDoc((d) => ({
      ...d,
      tiers: d.tiers.map((t, i) => (i === index ? { ...t, ...change } : t)),
    }));

  async function runImport() {
    const { tiers, errors } = parseImport(importText);
    setBusy(true);
    setStatus('Importing…');
    const lines = tiers.flatMap((t) => t.cards);
    const resolved = await mapLimit(lines, 4, resolveCard);
    const found = new Map(lines.map((line, i) => [line, resolved[i]]));
    for (const line of lines) {
      if (!found.get(line)) errors.push(`Line ${line.line}: couldn't find "${line.name}".`);
    }
    // Imported cards go after the ones already in each tier. Pure, so it can run on the
    // latest board (it may have changed while cards were looking up)
    const addImported = (d: TierListDoc) => {
      const overflow: string[] = [];
      const next = {
        ...d,
        tiers: d.tiers.map((tier, i) => {
          const imported = tiers[i];
          const items = [
            ...tier.items,
            ...(imported?.cards ?? []).flatMap((line) => found.get(line) ?? []),
          ];
          const name = imported?.name ?? tier.name;
          if (items.length > MAX_CARDS_PER_TIER) {
            overflow.push(
              `${name}: ${items.length - MAX_CARDS_PER_TIER} cards didn't fit (${MAX_CARDS_PER_TIER} per tier).`
            );
          }
          return { ...tier, name, items: items.slice(0, MAX_CARDS_PER_TIER) };
        }),
      };
      return { next, overflow };
    };
    setDoc((d) => addImported(d).next);
    setBusy(false);
    errors.push(...addImported(doc).overflow);
    const added = resolved.filter(Boolean).length;
    setStatus(
      errors.length ? errors.join('\n') : `Added ${added} ${added === 1 ? 'card' : 'cards'}.`
    );
  }

  async function search(text: string) {
    // A blank search clears the results
    if (!text.trim()) {
      setResults([]);
      setStatus('');
      return;
    }
    setBusy(true);
    const found = await searchCards(text.trim());
    setResults(found);
    setStatus(found.length ? '' : 'No cards found.');
    setBusy(false);
  }

  // Replace card: searches the card's name (its other prints), and the next result
  // clicked takes its place
  function startReplacing(id: string) {
    const item = doc.tiers.flatMap((t) => t.items).find((i) => i.id === id);
    if (!item) return;
    setReplacingId(id);
    setQuery(item.name);
    searchInputRef.current?.scrollIntoView({ block: 'center' });
    searchInputRef.current?.focus();
    search(item.name);
  }

  const replacing = doc.tiers.flatMap((t) => t.items).find((i) => i.id === replacingId);

  function pickResult(card: CardResult) {
    if (replacing) {
      const name = query.trim() || replacing.name;
      setDoc((d) => ({
        ...d,
        tiers: d.tiers.map((t) => ({
          ...t,
          items: t.items.map((i) =>
            i.id === replacing.id
              ? { ...i, name, set: card.set, number: card.number, image: card.image }
              : i
          ),
        })),
      }));
      setReplacingId(null);
      return;
    }
    if (doc.tiers[targetTier].items.length >= MAX_CARDS_PER_TIER) {
      setStatus(`That tier is full (${MAX_CARDS_PER_TIER} cards).`);
      return;
    }
    const item = toItem(card, query.trim());
    updateTier(targetTier, { items: [...doc.tiers[targetTier].items, item] });
  }

  // A search result dropped on the board lands in the tier and position under the pointer
  function dropResult(e: React.DragEvent) {
    const card = draggedResult.current;
    const stage = stageRef.current;
    draggedResult.current = null;
    if (!card || !stage) return;
    e.preventDefault();
    const box = stage.container().getBoundingClientRect();
    const x = (e.clientX - box.left) / scale;
    const y = (e.clientY - box.top) / scale;
    const target = dropTarget(doc, '', x, y);
    const item = toItem(card, query.trim());
    const next = insertCard(doc, item, target.tierIndex, target.index);
    if (!next) {
      setStatus(`That tier is full (${MAX_CARDS_PER_TIER} cards).`);
      return;
    }
    setDoc(next);
  }

  // Waits for card images, then draws the board at export size without editor marks
  async function renderBlob() {
    const stage = stageRef.current;
    if (!stage) return null;
    setSelectedId(null);
    await Promise.allSettled(doc.tiers.flatMap((t) => t.items.map((i) => loadImage(i.image))));
    await document.fonts.ready;
    // Let React draw the cards whose images just finished loading
    await new Promise((resolve) => setTimeout(resolve, 100));
    const editor = stage.findOne('.editor');
    editor?.hide();
    try {
      return (await stage.toBlob({ pixelRatio: EXPORT_SCALE / scale })) as Blob;
    } finally {
      editor?.show();
    }
  }

  async function exportPng() {
    const blob = await renderBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tier-list.png';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyPng() {
    const blob = await renderBlob();
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setStatus('Copied to clipboard.');
    } catch {
      setStatus("Couldn't copy; use Export PNG.");
    }
  }

  return (
    <div className="tier-stack-page w-full max-w-[1240px] p-[20px] flex flex-col gap-[16px] text-[14px] text-black">
      <div
        ref={boardBoxRef}
        className="w-full relative"
        onDragOver={(e) => {
          if (draggedResult.current) e.preventDefault();
        }}
        onDrop={dropResult}
      >
        <Board
          doc={doc}
          scale={scale}
          fontFamily={fontFamily}
          selectedId={selectedId}
          onChange={setDoc}
          onSelect={setSelectedId}
          onCardMenu={(id, x, y) => setCardMenu({ id, x, y })}
          onEditTier={(i) => {
            if (tiersPanelRef.current) tiersPanelRef.current.open = true;
            tierNameRefs.current[i]?.focus();
          }}
          onStage={(stage) => {
            stageRef.current = stage;
          }}
        />
        {cardMenu && doc.tiers.some((t) => t.items.some((i) => i.id === cardMenu.id)) && (
          <div
            ref={cardMenuRef}
            role="menu"
            className="absolute z-10 flex flex-col min-w-[160px] border border-black bg-white shadow-md"
            // Kept inside the board's right edge
            style={{
              left: Math.min(cardMenu.x, BOARD_WIDTH * scale - 160),
              top: cardMenu.y,
            }}
          >
            <button
              role="menuitem"
              className="px-[8px] py-[4px] text-left hover:bg-black/10"
              onClick={() => {
                removeCard(cardMenu.id);
                setCardMenu(null);
              }}
            >
              Remove card
            </button>
            <button
              role="menuitem"
              className="px-[8px] py-[4px] text-left hover:bg-black/10"
              onClick={() => {
                startReplacing(cardMenu.id);
                setCardMenu(null);
              }}
            >
              Replace card
            </button>
            <button
              role="menuitem"
              className="px-[8px] py-[4px] text-left disabled:opacity-50"
              disabled
            >
              Make split card
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-[8px] items-center">
        <button className={button} onClick={exportPng} disabled={busy}>
          Export PNG ({BOARD_WIDTH * EXPORT_SCALE}px)
        </button>
        <button className={button} onClick={copyPng} disabled={busy}>
          Copy PNG
        </button>
        <button className={button} onClick={removeSelected} disabled={!selectedId}>
          Remove selected card
        </button>
        {/* Confirmed on the page: some browsers (the in-app one) never show confirm() */}
        {confirmingNew ? (
          <span className="flex items-center gap-[8px]">
            Clear the board?
            <button
              className={button}
              onClick={() => {
                setDoc(defaultDoc());
                setSelectedId(null);
                setConfirmingNew(false);
              }}
            >
              Yes
            </button>
            <button className={button} onClick={() => setConfirmingNew(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button className={button} onClick={() => setConfirmingNew(true)}>
            New board
          </button>
        )}
      </div>

      {status && <p className="whitespace-pre-line">{status}</p>}

      <div className="grid gap-[16px] md:grid-cols-3">
        {/* min-w-0 so the results scroll instead of widening the column */}
        <section className="flex flex-col gap-[8px] min-w-0">
          <h2 className="font-bold">Add a card</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search(query);
            }}
            className="flex gap-[8px]"
          >
            <input
              ref={searchInputRef}
              className="border border-black px-[4px] flex-1"
              placeholder="Card name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className={button} disabled={busy}>
              Search
            </button>
          </form>
          {replacing ? (
            <p className="flex gap-[8px] items-center">
              Replacing {replacing.name}
              <button className={button} onClick={() => setReplacingId(null)}>
                Cancel
              </button>
            </p>
          ) : (
            <label className="flex gap-[8px] items-center">
              Add to
              <select
                className="border border-black"
                value={targetTier}
                onChange={(e) => setTargetTier(Number(e.target.value))}
              >
                {doc.tiers.map((t, i) => (
                  <option key={t.id} value={i}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {/* Fixed-size tiles (80x111 card + 14px caption), as many per row as fit; the
              box is 3 rows tall (3 x 125 + 2 x 4) and scrolls down */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] auto-rows-[125px] gap-[4px] max-h-[383px] overflow-y-auto overflow-x-hidden empty:hidden">
            {results.map((card) => (
              // A div, not a button: Firefox won't start a drag from a button
              <div
                key={`${card.set}-${card.number}`}
                role="button"
                tabIndex={0}
                title={`${card.set} ${card.number}`}
                className="cursor-grab flex flex-col items-center text-[11px] leading-[14px]"
                draggable
                onDragStart={(e) => {
                  draggedResult.current = card;
                  e.dataTransfer.effectAllowed = 'copy';
                  e.dataTransfer.setData('text/plain', `${card.set} ${card.number}`);
                }}
                onDragEnd={() => {
                  draggedResult.current = null;
                }}
                onClick={() => pickResult(card)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    pickResult(card);
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnails, no optimization needed */}
                <img
                  src={card.thumb}
                  alt={`${card.set} ${card.number}`}
                  className="w-[80px] h-[111px] object-contain"
                  loading="lazy"
                  draggable={false}
                  // The CDN occasionally fails a load; retry once through the image proxy
                  onError={(e) => {
                    const proxy = proxied(card.thumb);
                    if (!e.currentTarget.src.endsWith(proxy)) e.currentTarget.src = proxy;
                  }}
                />
                <span className="w-full truncate text-center">
                  {card.set} {card.number}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Collapsed by default; the content is wrapped since <details> doesn't lay out as flex everywhere */}
        <details ref={tiersPanelRef}>
          <summary className="font-bold cursor-pointer">Customize Board</summary>
          <div className="flex flex-col gap-[8px] mt-[8px]">
            <h3 className="font-bold">Tiers</h3>
            {doc.tiers.map((tier, i) => (
              <div key={tier.id} className="flex gap-[8px] items-center">
                <ColorField
                  label={`${tier.name} color`}
                  value={tier.color}
                  onChange={(color) => updateTier(i, { color })}
                />
                {/* One line, so line breaks are typed as \n (as in bulk import) */}
                <input
                  ref={(el) => {
                    tierNameRefs.current[i] = el;
                  }}
                  aria-label={`Tier ${i + 1} name`}
                  className="border border-black px-[4px] flex-1"
                  value={tier.name.replaceAll('\n', '\\n')}
                  onChange={(e) => updateTier(i, { name: e.target.value.replaceAll('\\n', '\n') })}
                />
              </div>
            ))}
            <label className="flex gap-[8px] items-center">
              <input
                type="checkbox"
                checked={doc.tierCardBorders}
                onChange={(e) => setDoc((d) => ({ ...d, tierCardBorders: e.target.checked }))}
              />
              Add tier colored border to cards
            </label>
            <h3 className="font-bold">Background</h3>
            <ColorField
              label="Background color"
              value={doc.background}
              onChange={(background) => setDoc((d) => ({ ...d, background }))}
            />
            <h3 className="font-bold">Border</h3>
            <ColorField
              label="Border color"
              value={doc.border}
              onChange={(border) => setDoc((d) => ({ ...d, border }))}
            />
          </div>
        </details>

        <details>
          <summary className="font-bold cursor-pointer">Bulk import</summary>
          <div className="flex flex-col gap-[8px] mt-[8px]">
            <textarea
              rows={10}
              className="border border-black px-[4px] font-mono text-[12px]"
              placeholder={'# Goated\nMew ex MEW 151\nAlakazam\n# Solid\nDragapult ex TWM 130'}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button className={button} onClick={runImport} disabled={busy || !importText.trim()}>
              Import (adds to the board)
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
