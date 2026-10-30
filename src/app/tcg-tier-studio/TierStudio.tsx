'use client';

import type Konva from 'konva';
import React from 'react';
import Board from './Board';
import { fetchCard, loadImage, mapLimit, searchCards, type CardResult } from './cards';
import { parseImport, type ImportLine } from './importText';
import {
  BOARD_WIDTH,
  EXPORT_SCALE,
  MAX_CARDS_PER_TIER,
  defaultDoc,
  newId,
  parseDoc,
  type CardItem,
  type TierListDoc,
} from './tierList';

// The tier list editor: the board plus a plain control panel. Kept deliberately
// unstyled; it's a tool for making images, not a page people visit.

const STORAGE_KEY = 'tcg-tier-studio-doc';

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

export default function TierStudio() {
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

  const stageRef = React.useRef<Konva.Stage | null>(null);
  const boardBoxRef = React.useRef<HTMLDivElement>(null);
  const tierNameRefs = React.useRef<(HTMLTextAreaElement | null)[]>([]);

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

  const removeSelected = React.useCallback(() => {
    if (!selectedId) return;
    setDoc((d) => ({
      ...d,
      tiers: d.tiers.map((t) => ({ ...t, items: t.items.filter((i) => i.id !== selectedId) })),
    }));
    setSelectedId(null);
  }, [selectedId]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest('input, textarea, select');
      if (!typing && (e.key === 'Delete' || e.key === 'Backspace')) removeSelected();
      if (!typing && e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeSelected]);

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
    setDoc((d) => ({
      ...d,
      tiers: d.tiers.map((tier, i) => {
        const imported = tiers[i];
        const items = (imported?.cards ?? []).flatMap((line) => found.get(line) ?? []);
        if (items.length > MAX_CARDS_PER_TIER) {
          errors.push(
            `${imported?.name ?? tier.name}: only the first ${MAX_CARDS_PER_TIER} cards fit.`
          );
        }
        return {
          ...tier,
          name: imported?.name ?? tier.name,
          items: items.slice(0, MAX_CARDS_PER_TIER),
        };
      }),
    }));
    setSelectedId(null);
    setBusy(false);
    setStatus(errors.length ? errors.join('\n') : `Imported ${lines.length} cards.`);
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    const found = await searchCards(query.trim());
    setResults(found);
    setStatus(found.length ? '' : 'No cards found.');
    setBusy(false);
  }

  function pickResult(card: CardResult) {
    if (selectedId) {
      // Swap the selected card's printing, keeping its place and name
      setDoc((d) => ({
        ...d,
        tiers: d.tiers.map((t) => ({
          ...t,
          items: t.items.map((i) =>
            i.id === selectedId
              ? { ...i, set: card.set, number: card.number, image: card.image }
              : i
          ),
        })),
      }));
      return;
    }
    if (doc.tiers[targetTier].items.length >= MAX_CARDS_PER_TIER) {
      setStatus(`That tier is full (${MAX_CARDS_PER_TIER} cards).`);
      return;
    }
    const item = toItem(card, query.trim());
    updateTier(targetTier, { items: [...doc.tiers[targetTier].items, item] });
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

  function saveJson() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tier-list.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const loaded = parseDoc(JSON.parse(await file.text()));
      if (!loaded) throw new Error('bad doc');
      setDoc(loaded);
      setSelectedId(null);
      setStatus('Loaded.');
    } catch {
      setStatus("That file isn't a tier list.");
    }
  }

  return (
    <div className="tier-studio-page w-full max-w-[1240px] p-[20px] flex flex-col gap-[16px] text-[14px] text-black">
      <div ref={boardBoxRef} className="w-full">
        <Board
          doc={doc}
          scale={scale}
          fontFamily={fontFamily}
          selectedId={selectedId}
          onChange={setDoc}
          onSelect={setSelectedId}
          onEditTier={(i) => tierNameRefs.current[i]?.focus()}
          onStage={(stage) => {
            stageRef.current = stage;
          }}
        />
      </div>

      <div className="flex flex-wrap gap-[8px] items-center">
        <button className={button} onClick={exportPng} disabled={busy}>
          Export PNG ({BOARD_WIDTH * EXPORT_SCALE}px)
        </button>
        <button className={button} onClick={copyPng} disabled={busy}>
          Copy PNG
        </button>
        <button className={button} onClick={saveJson}>
          Save JSON
        </button>
        <label className={button}>
          Load JSON
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={loadJson}
          />
        </label>
        <button className={button} onClick={removeSelected} disabled={!selectedId}>
          Remove selected card
        </button>
        <button
          className={button}
          onClick={() => {
            if (confirm('Start a new board? This clears the current one.')) {
              setDoc(defaultDoc());
              setSelectedId(null);
            }
          }}
        >
          New board
        </button>
        <label className="flex items-center gap-[4px]">
          Background
          <input
            type="color"
            value={doc.background}
            onChange={(e) => setDoc((d) => ({ ...d, background: e.target.value }))}
          />
        </label>
      </div>

      {status && <p className="whitespace-pre-line">{status}</p>}

      <div className="grid gap-[16px] md:grid-cols-3">
        <section className="flex flex-col gap-[8px]">
          <h2 className="font-bold">Tiers</h2>
          {doc.tiers.map((tier, i) => (
            <div key={tier.id} className="flex gap-[8px] items-start">
              <input
                type="color"
                value={tier.color}
                onChange={(e) => updateTier(i, { color: e.target.value })}
              />
              <textarea
                ref={(el) => {
                  tierNameRefs.current[i] = el;
                }}
                rows={2}
                className="border border-black px-[4px] flex-1"
                value={tier.name}
                onChange={(e) => updateTier(i, { name: e.target.value })}
              />
              <button className={button} onClick={() => updateTier(i, { items: [] })}>
                Clear
              </button>
            </div>
          ))}
          <p className="text-[12px]">
            Drag cards to move them. Click a card and press Delete to remove it. Double-click a tier
            label to rename it.
          </p>
        </section>

        <section className="flex flex-col gap-[8px]">
          <h2 className="font-bold">Bulk import</h2>
          <textarea
            rows={10}
            className="border border-black px-[4px] font-mono text-[12px]"
            placeholder={'# EZ Dub\nMew ex MEW 151\nAlakazam\n# 50/50\nDragapult ex TWM 130'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button className={button} onClick={runImport} disabled={busy || !importText.trim()}>
            Import (replaces all cards)
          </button>
          <p className="text-[12px]">
            <code>#</code> starts the next tier (text after it renames the tier; <code>\n</code>{' '}
            breaks the line). Cards are <code>Name SET 123</code>, or just a name for its newest
            regular print.
          </p>
        </section>

        <section className="flex flex-col gap-[8px]">
          <h2 className="font-bold">Find a card</h2>
          <form onSubmit={runSearch} className="flex gap-[8px]">
            <input
              className="border border-black px-[4px] flex-1"
              placeholder="Card name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className={button} disabled={busy}>
              Search
            </button>
          </form>
          <label className="flex gap-[8px] items-center">
            {selectedId ? 'Click a result to swap the selected card.' : 'Add to'}
            {!selectedId && (
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
            )}
          </label>
          <div className="grid grid-cols-5 gap-[4px] max-h-[360px] overflow-y-auto">
            {results.map((card) => (
              <button
                key={`${card.set}-${card.number}`}
                title={`${card.set} ${card.number}`}
                onClick={() => pickResult(card)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnails, no optimization needed */}
                <img src={card.thumb} alt={`${card.set} ${card.number}`} loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
