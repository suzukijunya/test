import type { ReactElement } from 'react';
/**
 * ドット絵の部品。スプライトは1文字＝1ドットの文字列で描く（'.' は透明）。
 * 色はファミコン風の限られたパレットだけを使う。
 */
export const PALETTE: Record<string, string> = {
  k: '#000000',
  w: '#fcfcfc',
  g: '#bcbcbc',
  d: '#7c7c7c',
  c: '#3c3c5c', // ネコのからだ
  C: '#6c6c8c', // ネコのハイライト
  y: '#fcd800',
  Y: '#c89800',
  p: '#f8b8d8',
  P: '#e8508c',
  r: '#d82800',
  o: '#fca044',
  n: '#c87838',
  N: '#7c4818',
  s: '#fcd8a8',
  G: '#00a844',
  L: '#58d854',
  b: '#3cbcfc',
  B: '#0058f8',
};

export type SpriteRows = readonly string[];

/** 1行ごとに同じ色が続くところを1つの四角にまとめて描く */
export function PixelRects({ rows, x = 0, y = 0 }: { rows: SpriteRows; x?: number; y?: number }) {
  const rects: ReactElement[] = [];
  rows.forEach((row, ry) => {
    let start = 0;
    for (let i = 1; i <= row.length; i++) {
      if (i === row.length || row[i] !== row[start]) {
        const ch = row[start];
        if (ch !== '.' && ch !== ' ' && PALETTE[ch]) {
          rects.push(<rect key={`${ry}-${start}`} x={x + start} y={y + ry} width={i - start} height={1} fill={PALETTE[ch]} />);
        }
        start = i;
      }
    }
  });
  return <g>{rects}</g>;
}

export function spriteSize(rows: SpriteRows) {
  return { w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

/** 単体のスプライト（size は横幅のpx） */
export function Sprite({
  rows,
  size,
  className,
  label,
}: {
  rows: SpriteRows;
  size: number;
  className?: string;
  label?: string;
}) {
  const { w, h } = spriteSize(rows);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      shapeRendering="crispEdges"
      className={`pixel ${className ?? ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <PixelRects rows={rows} />
    </svg>
  );
}

// ---------- スプライト ----------

export const CAT: SpriteRows = [
  '...k........k...',
  '..kpk......kpk..',
  '..kppkkkkkkppk..',
  '.kcccccccccccck.',
  '.kccykcccckycck.',
  '.kccyyccccyycck.',
  '.kcpcccPPcccpck.',
  '.kcccckcckcccck.',
  '..kcccccccccck..',
  '..kPPPPPPPPPPk..',
  '.kcccccPPccccck.',
  '.kcCcccccccccck.',
  '.kcCcccccccccck.',
  '.kccCCccccCCcck.',
  '..kkkkkkkkkkkk..',
  '................',
];

/** まばたき */
export const CAT_BLINK: SpriteRows = CAT.map((r, i) => (i === 4 ? '.kcckkcccckkcck.' : i === 5 ? '.kcccccccccccck.' : r));

/** 歩き（足を入れかえる） */
export const CAT_STEP: SpriteRows = CAT.map((r, i) =>
  i === 13 ? '.kCCccccccccCCk.' : i === 14 ? '.kkkkkkkkkkkkkk.' : r,
);

export const COIN: SpriteRows = [
  '..kkkk..',
  '.kyyyyk.',
  'kywyyyYk',
  'kyyYYyYk',
  'kyyYYyYk',
  'kyyyyyYk',
  '.kYYYYk.',
  '..kkkk..',
];

export const HEART: SpriteRows = [
  '.kk..kk.',
  'kPPkkPPk',
  'kPwPPPPk',
  'kPPPPPPk',
  '.kPPPPk.',
  '..kPPk..',
  '...kk...',
];

export const WINDOW: SpriteRows = [
  'kkkkkkkkkkkkkkkk',
  'knnnnnnnnnnnnnnk',
  'knbbbbbnnbbbbbnk',
  'knbwwbbnnbbbbbnk',
  'knwwwwbnnbbbbbnk',
  'knbbbbbnnbbwwbnk',
  'knbbbbbnnbwwwwnk',
  'knnnnnnnnnnnnnnk',
  'knnnnnnnnnnnnnnk',
  'knbbbbbnnbbbbbnk',
  'knbbwbbnnbbbbbnk',
  'knbbbbbnnbbbbbnk',
  'knbbbbbnnbbwbbnk',
  'knbbbbbnnbbbbbnk',
  'knnnnnnnnnnnnnnk',
  'kkkkkkkkkkkkkkkk',
];

export const DECOR_SPRITES: Record<string, SpriteRows> = {
  mugs: [
    '...w......w.....',
    '....w......w....',
    '...w......w.....',
    '.kkkkk...kkkkk..',
    '.kwwwkk..kPPPkk.',
    '.kwPwk.k.kPwPk.k',
    '.kwwwkk..kPPPkk.',
    '.kwwwk...kPPPk..',
    '..kkk.....kkk...',
  ],
  cake: [
    '.......y........',
    '.......o........',
    '.......w........',
    '...kkkkkkkkkk...',
    '..kwwrwwwwrwwk..',
    '..kwwwwwwwwwwk..',
    '..kPwPwPwPwPwk..',
    '..kppppppppppk..',
    '..kppppppppppk..',
    '..kppppppppppk..',
    '.kggggggggggggk.',
    '..kkkkkkkkkkkk..',
  ],
  plant: [
    '.......G........',
    '......GLG.......',
    '..G...GLG...G...',
    '.GLG..GLG..GLG..',
    '.GLLG.GLG.GLLG..',
    '..GLLGGLGGLLG...',
    '...GLLGLGLLG....',
    '....GGGLGGG.....',
    '......GLG.......',
    '...kkkkkkkkkk...',
    '...knnnnnnnnk...',
    '....kNNNNNNk....',
    '....knnnnnnk....',
    '....knnnnnnk....',
    '.....kkkkkk.....',
  ],
  lamp: [
    '.......k........',
    '.......k........',
    '.......k........',
    '.......k........',
    '.....kkkkk......',
    '....koooook.....',
    '...kooyyoook....',
    '..koooooooook...',
    '.koooooooooook..',
    '.kkkkkkkkkkkkk..',
    '......kyyk......',
    '.......kk.......',
    '......y..y......',
    '.....y....y.....',
  ],
  frame: [
    'kkkkkkkkkkkkkk',
    'kYYYYYYYYYYYYk',
    'kYkkkkkkkkkkYk',
    'kYkbbbbbbbbkYk',
    'kYkbPPbbPPbkYk',
    'kYkbPPPPPPbkYk',
    'kYkbbPPPPbbkYk',
    'kYkbbbPPbbbkYk',
    'kYkGGGGGGGGkYk',
    'kYkkkkkkkkkkYk',
    'kYYYYYYYYYYYYk',
    'kkkkkkkkkkkkkk',
  ],
  cushion: [
    '..kk..........kk..',
    '.kPPkkkkkkkkkkPPk.',
    'kPPPPPPPPPPPPPPPPk',
    'kPppppppppppppppPk',
    'kPPPPPPPPPPPPPPPPk',
    '.kkkkkkkkkkkkkkkk.',
  ],
  shelf: [
    'kkkkkkkkkkkkkkkk',
    'knnnnnnnnnnnnnnk',
    'knkkkkkkkkkkkknk',
    'knk..........knk',
    'knk.kkk.kkk..knk',
    'knk.kwk.kPk..knk',
    'knk.kkk.kkk..knk',
    'knNNNNNNNNNNNNnk',
    'knk..........knk',
    'knk.rr.bb.GG.knk',
    'knk.rr.bb.GG.knk',
    'knk.rr.bb.GG.knk',
    'knNNNNNNNNNNNNnk',
    'knk..........knk',
    'knk..kyyk....knk',
    'knk..kyyk.Pp.knk',
    'knNNNNNNNNNNNNnk',
    'knnnnnnnnnnnnnnk',
    'kkkkkkkkkkkkkkkk',
  ],
  tower: [
    '.....kkkkkk.....',
    '....kppppppk....',
    '...kppppppppk...',
    '...kPPPPPPPPk...',
    '....kkkkkkkk....',
    '......kgk.......',
    '......kgk..k....',
    '......kgk..k....',
    '......kgk.kPk...',
    '......kgk..k....',
    '......kgk.......',
    '..kkkkkkkkkkkk..',
    '.kppppppppppppk.',
    '.kPPPPPPPPPPPPk.',
    '..kkkkkkkkkkkk..',
    '......kgk.......',
    '......kgk.......',
    '......kgk.......',
    '......kgk.......',
    '......kgk.......',
    '......kgk.......',
    '......kgk.......',
    '.kkkkkkkkkkkkkk.',
    'kppppppppppppppk',
    'kPPPPPPPPPPPPPPk',
    'kkkkkkkkkkkkkkkk',
  ],
  flowers: [
    '....P.....P.....',
    '...PyP...PyP....',
    '....P..r..P.....',
    '....G.ryr.G.....',
    '.....G.r.G......',
    '......GGG.......',
    '.......G........',
    '.....kkkkk......',
    '....kbbbbbk.....',
    '....kbwbbbk.....',
    '....kbbbbbk.....',
    '.....kbbbk......',
    '.....kkkkk......',
  ],
  curtain: [
    'kkkkkkkkkkkkkkkkkkkkkkkk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kyyyyk............kyyyyk',
    '.kpPk..............kPpk.',
    '.kpPk..............kPpk.',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kpPpPk............kPpPpk',
    'kkkkkk............kkkkkk',
  ],
  // ガーランドと絨毯はアイコン用。部屋ではコードで描く
  lights: [
    'kkkkkkkkkkkkkkkk',
    '.PPP.yyy.PPP.bbb',
    '..P...y...P...b.',
  ],
  rug: [
    '.PPPPPPPPPPPPPP.',
    'PppwppppppppwppP',
    'PpppppwwpppppppP',
    'PppwppppppppwppP',
    '.PPPPPPPPPPPPPP.',
  ],
};
