import { useEffect, useState, type ReactElement } from 'react';
import { CAT, CAT_BLINK, DECOR_SPRITES, PALETTE, PixelRects, Sprite, WINDOW } from './pixel';

/**
 * ふたりのおへや（ドット絵、112×84ドット）。
 * 飾りは決まった場所に置く。下の床はステータス表示のための余白も兼ねる。
 */
const W = 112;
const H = 84;

/** 飾りの置き場所（スプライトの左上） */
const SPOTS: Record<string, { x: number; y: number }> = {
  lamp: { x: 26, y: 0 },
  frame: { x: 47, y: 12 },
  curtain: { x: 68, y: 7 },
  shelf: { x: 3, y: 33 },
  plant: { x: 20, y: 37 },
  tower: { x: 94, y: 26 },
  flowers: { x: 74, y: 39 },
  cushion: { x: 47, y: 59 },
  cake: { x: 36, y: 59 },
  mugs: { x: 61, y: 62 },
};

function Wall() {
  const lines: ReactElement[] = [];
  for (let y = 5; y < 52; y += 6) {
    lines.push(<rect key={`h${y}`} x={0} y={y} width={W} height={1} fill="#c8a078" />);
    const offset = (y / 6) % 2 ? 6 : 0;
    for (let x = offset; x < W; x += 12) {
      lines.push(<rect key={`v${y}-${x}`} x={x} y={y + 1} width={1} height={5} fill="#c8a078" />);
    }
  }
  return (
    <g>
      <rect x={0} y={0} width={W} height={52} fill="#e8c8a0" />
      {lines}
      <rect x={0} y={50} width={W} height={2} fill={PALETTE.N} />
    </g>
  );
}

function Floor() {
  const lines: ReactElement[] = [];
  for (let y = 52; y < H; y += 4) {
    lines.push(<rect key={`h${y}`} x={0} y={y + 3} width={W} height={1} fill={PALETTE.N} />);
    const offset = ((y - 52) / 4) % 2 ? 10 : 0;
    for (let x = offset; x < W; x += 20) lines.push(<rect key={`v${y}-${x}`} x={x} y={y} width={1} height={3} fill={PALETTE.N} />);
  }
  return (
    <g>
      <rect x={0} y={52} width={W} height={H - 52} fill={PALETTE.n} />
      {lines}
    </g>
  );
}

function Lights() {
  const flags = [];
  const colors = [PALETTE.P, PALETTE.y, PALETTE.b, PALETTE.w];
  for (let i = 0, x = 4; x < W - 4; x += 9, i++) {
    flags.push(
      <g key={x}>
        <rect x={x} y={3} width={5} height={1} fill={colors[i % 4]} />
        <rect x={x + 1} y={4} width={3} height={1} fill={colors[i % 4]} />
        <rect x={x + 2} y={5} width={1} height={1} fill={colors[i % 4]} />
      </g>,
    );
  }
  return (
    <g>
      <rect x={0} y={2} width={W} height={1} fill={PALETTE.k} />
      {flags}
    </g>
  );
}

function Rug() {
  return (
    <g>
      <rect x={22} y={67} width={70} height={14} fill={PALETTE.P} />
      <rect x={24} y={69} width={66} height={10} fill={PALETTE.p} />
      {[30, 42, 54, 66, 78].map((x) => (
        <rect key={x} x={x} y={73} width={2} height={2} fill={PALETTE.w} />
      ))}
    </g>
  );
}

function Table() {
  return (
    <g>
      <rect x={32} y={70} width={48} height={1} fill={PALETTE.k} />
      <rect x={31} y={71} width={50} height={4} fill={PALETTE.o} />
      <rect x={31} y={74} width={50} height={1} fill={PALETTE.N} />
      <rect x={31} y={75} width={50} height={1} fill={PALETTE.k} />
      <rect x={34} y={76} width={3} height={7} fill={PALETTE.N} />
      <rect x={75} y={76} width={3} height={7} fill={PALETTE.N} />
    </g>
  );
}

/** 飾りのアイコン（お店・カード用） */
export function DecorIcon({ id, size = 56 }: { id: string; size?: number }) {
  const rows = DECOR_SPRITES[id];
  return rows ? <Sprite rows={rows} size={size} /> : null;
}

/** ふたりのおへや全体（ネコはときどきまばたきする） */
export function RoomScene({ placed, className }: { placed: string[]; className?: string }) {
  const has = (id: string) => placed.includes(id);
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3200);
    return () => clearInterval(t);
  }, []);
  const at = (id: string) =>
    has(id) && SPOTS[id] ? <PixelRects key={id} rows={DECOR_SPRITES[id]} x={SPOTS[id].x} y={SPOTS[id].y} /> : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`pixel ${className ?? ''}`} shapeRendering="crispEdges" role="img" aria-label="ふたりのおへや">
      <Wall />
      <Floor />
      <PixelRects rows={WINDOW} x={72} y={10} />
      {has('lights') && <Lights />}
      {at('curtain')}
      {at('lamp')}
      {at('frame')}
      {at('shelf')}
      {at('plant')}
      {at('tower')}
      {at('flowers')}
      {has('rug') && <Rug />}
      {at('cushion')}
      <PixelRects rows={blink ? CAT_BLINK : CAT} x={48} y={50} />
      <Table />
      {at('cake')}
      {at('mugs')}
    </svg>
  );
}
