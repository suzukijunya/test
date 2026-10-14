import type { ReactNode } from 'react';
import { CatSitting } from './Cat';

/**
 * ふたりのおへや（viewBox 0 0 360 312。下の床は情報表示のための余白）。
 * 飾りは部屋の座標で描き、カード用のアイコンは box で切り抜いて同じ絵を使う。
 */
const S = { stroke: 'var(--ink)', strokeWidth: 2.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

interface DecorArt {
  /** カードに切り出すときの範囲 [x, y, w, h] */
  box: [number, number, number, number];
  /** 部屋の奥（ネコより後ろ）に描くか */
  back: boolean;
  draw: () => ReactNode;
}

export const DECOR_ART: Record<string, DecorArt> = {
  lights: {
    box: [8, 8, 344, 40],
    back: true,
    draw: () => (
      <g>
        <path d="M10 14 Q180 50 350 14" fill="none" {...S} />
        {[40, 75, 110, 145, 180, 215, 250, 285, 320].map((x, i) => {
          const y = 14 + 36 * (1 - Math.pow((x - 180) / 170, 2)) * 0.62;
          return (
            <path
              key={x}
              d={`M${x - 8} ${y - 2} L${x + 8} ${y - 2} L${x} ${y + 13} Z`}
              fill={i % 2 ? 'var(--white)' : 'var(--pink)'}
              {...S}
              strokeWidth={1.8}
            />
          );
        })}
      </g>
    ),
  },
  lamp: {
    box: [62, 0, 56, 74],
    back: true,
    draw: () => (
      <g>
        <path d="M90 0 V30" {...S} />
        <path d="M66 62 Q66 30 90 30 Q114 30 114 62 Z" fill="var(--pink)" {...S} />
        <path d="M74 44 H106 M70 54 H110 M82 33 V61 M98 33 V61" stroke="var(--pink-line)" strokeWidth={1.6} />
        <path d="M66 62 Q66 30 90 30 Q114 30 114 62 Z" fill="none" {...S} />
        <ellipse cx={90} cy={66} rx={7} ry={4} fill="var(--white)" {...S} />
      </g>
    ),
  },
  curtain: {
    box: [222, 24, 120, 126],
    back: true,
    draw: () => (
      <g>
        <path d="M224 28 H340" {...S} strokeWidth={3} />
        <path d="M226 30 Q238 80 230 146 Q244 146 254 140 Q246 84 252 30 Z" fill="var(--white)" {...S} />
        <path d="M338 30 Q326 80 334 146 Q320 146 310 140 Q318 84 312 30 Z" fill="var(--white)" {...S} />
        <path d="M236 40 Q240 90 236 136 M326 40 Q322 90 326 136" stroke="var(--pink)" strokeWidth={1.6} fill="none" />
        <path d="M232 98 Q244 104 254 98 M332 98 Q320 104 310 98" fill="none" {...S} stroke="var(--pink-line)" strokeWidth={3} />
      </g>
    ),
  },
  shelf: {
    box: [14, 64, 100, 108],
    back: true,
    draw: () => (
      <g>
        <rect x={18} y={68} width={92} height={100} rx={6} fill="var(--white)" {...S} />
        <path d="M18 101 H110 M18 134 H110" {...S} />
        {/* カップ */}
        {[28, 52, 76].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 84 h16 v10 a6 6 0 0 1 -6 6 h-4 a6 6 0 0 1 -6 -6 z`} fill={i === 1 ? 'var(--pink)' : 'var(--white)'} {...S} strokeWidth={1.8} />
            <path d={`M${x + 16} 87 q6 0 6 5 q0 4 -6 4`} fill="none" {...S} strokeWidth={1.8} />
          </g>
        ))}
        {/* びん */}
        <rect x={30} y={112} width={16} height={20} rx={4} fill="var(--pink)" {...S} strokeWidth={1.8} />
        <rect x={32} y={107} width={12} height={6} rx={2} fill="var(--white)" {...S} strokeWidth={1.8} />
        <rect x={56} y={116} width={14} height={16} rx={4} fill="var(--white)" {...S} strokeWidth={1.8} />
        <path d="M80 132 q0 -16 10 -16 q10 0 10 16 z" fill="var(--pink-soft)" {...S} strokeWidth={1.8} />
        {/* 本 */}
        <rect x={28} y={146} width={8} height={20} fill="var(--pink)" {...S} strokeWidth={1.8} />
        <rect x={37} y={142} width={8} height={24} fill="var(--white)" {...S} strokeWidth={1.8} />
        <rect x={46} y={148} width={8} height={18} fill="var(--pink-line)" {...S} strokeWidth={1.8} />
        <path d="M70 166 l10 -24 l8 3 l-10 23" fill="var(--white)" {...S} strokeWidth={1.8} />
      </g>
    ),
  },
  frame: {
    box: [158, 34, 52, 52],
    back: true,
    draw: () => (
      <g>
        <rect x={162} y={38} width={44} height={44} rx={6} fill="var(--white)" {...S} />
        <rect x={168} y={44} width={32} height={32} rx={3} fill="var(--pink-soft)" {...S} strokeWidth={1.6} />
        <path d="M184 70 c-6 -5 -11 -8 -11 -13 c0 -3 2.5 -5 5.5 -5 c2.5 0 4 1.4 5.5 3.4 c1.5 -2 3 -3.4 5.5 -3.4 c3 0 5.5 2 5.5 5 c0 5 -5 8 -11 13z" fill="var(--pink-line)" />
      </g>
    ),
  },
  plant: {
    box: [8, 132, 76, 108],
    back: true,
    draw: () => (
      <g>
        {[
          'M46 196 C30 186 18 168 22 150 C36 158 46 176 46 196',
          'M46 196 C60 180 72 170 78 150 C62 152 50 170 46 196',
          'M46 196 C40 176 40 156 48 138 C56 156 54 178 46 196',
          'M46 198 C28 196 16 188 12 176 C28 176 40 184 46 198',
          'M46 198 C62 196 74 192 80 180 C66 178 54 186 46 198',
        ].map((d, i) => (
          <path key={i} d={d} fill={i % 2 ? 'var(--pink)' : 'var(--white)'} {...S} />
        ))}
        <path d="M28 196 H66 L60 236 H34 Z" fill="var(--white)" {...S} />
        <path d="M30 206 H64" stroke="var(--pink-line)" strokeWidth={3} />
      </g>
    ),
  },
  tower: {
    box: [284, 112, 72, 132],
    back: true,
    draw: () => (
      <g>
        <rect x={312} y={140} width={14} height={96} fill="var(--white)" {...S} />
        <path d="M313 160 h12 M313 180 h12 M313 200 h12 M313 220 h12" stroke="var(--pink-line)" strokeWidth={1.8} />
        <rect x={290} y={130} width={60} height={14} rx={7} fill="var(--pink)" {...S} />
        <rect x={296} y={186} width={48} height={12} rx={6} fill="var(--pink)" {...S} />
        <rect x={288} y={232} width={64} height={10} rx={5} fill="var(--white)" {...S} />
        <path d="M300 130 q0 -14 20 -14 q20 0 20 14" fill="var(--white)" {...S} />
        <circle cx={340} cy={150} r={5} fill="var(--pink-line)" {...S} strokeWidth={1.6} />
        <path d="M340 144 V138" {...S} strokeWidth={1.4} />
      </g>
    ),
  },
  flowers: {
    box: [254, 96, 52, 56],
    back: true,
    draw: () => (
      <g>
        <path d="M280 132 V112 M280 132 L268 114 M280 132 L292 114" {...S} strokeWidth={1.8} />
        {[
          [280, 108],
          [266, 112],
          [294, 112],
        ].map(([x, y], i) => (
          <g key={i}>
            {[0, 72, 144, 216, 288].map((a) => (
              <circle
                key={a}
                cx={x + 5 * Math.cos((a * Math.PI) / 180)}
                cy={y + 5 * Math.sin((a * Math.PI) / 180)}
                r={4}
                fill={i === 0 ? 'var(--pink-line)' : 'var(--pink)'}
                {...S}
                strokeWidth={1.4}
              />
            ))}
            <circle cx={x} cy={y} r={2.6} fill="var(--white)" />
          </g>
        ))}
        <path d="M270 128 H290 L287 148 H273 Z" fill="var(--white)" {...S} />
      </g>
    ),
  },
  rug: {
    box: [20, 234, 320, 46],
    back: true,
    draw: () => (
      <g>
        <ellipse cx={180} cy={258} rx={156} ry={20} fill="var(--pink)" {...S} />
        <ellipse cx={180} cy={258} rx={136} ry={14} fill="none" stroke="var(--white)" strokeWidth={2.4} strokeDasharray="8 6" />
      </g>
    ),
  },
  cushion: {
    box: [124, 194, 112, 36],
    back: true,
    draw: () => (
      <g>
        <ellipse cx={180} cy={212} rx={52} ry={14} fill="var(--pink)" {...S} />
        <path d="M134 208 q46 12 92 0" fill="none" stroke="var(--pink-line)" strokeWidth={2} />
        <path d="M144 202 l-6 -10 l12 4 M216 202 l6 -10 l-12 4" fill="var(--pink)" {...S} strokeWidth={1.8} />
      </g>
    ),
  },
  cake: {
    box: [70, 196, 66, 52],
    back: false,
    draw: () => (
      <g>
        <ellipse cx={103} cy={240} rx={30} ry={6} fill="var(--white)" {...S} />
        <path d="M80 238 V218 Q103 210 126 218 V238 Q103 244 80 238 Z" fill="var(--white)" {...S} />
        <path d="M80 222 Q86 230 92 222 Q98 230 103 222 Q109 230 114 222 Q120 230 126 222" fill="none" stroke="var(--pink-line)" strokeWidth={3} />
        <ellipse cx={103} cy={217} rx={23} ry={6} fill="var(--pink-soft)" {...S} />
        <circle cx={96} cy={212} r={4} fill="var(--pink-line)" {...S} strokeWidth={1.4} />
        <circle cx={110} cy={212} r={4} fill="var(--pink-line)" {...S} strokeWidth={1.4} />
        <path d="M103 212 V200" {...S} />
        <path d="M103 198 q-3 -4 0 -7 q3 3 0 7" fill="var(--pink)" {...S} strokeWidth={1.4} />
      </g>
    ),
  },
  mugs: {
    box: [222, 204, 70, 44],
    back: false,
    draw: () => (
      <g>
        {[
          [228, 'var(--white)'],
          [256, 'var(--pink)'],
        ].map(([x, fill]) => (
          <g key={x as number}>
            <path d={`M${x} 214 h22 v18 a8 8 0 0 1 -8 8 h-6 a8 8 0 0 1 -8 -8 z`} fill={fill as string} {...S} />
            <path d={`M${(x as number) + 22} 218 q8 0 8 7 q0 6 -8 6`} fill="none" {...S} />
            <path
              d={`M${(x as number) + 11} 230 c-3 -2.5 -5.5 -4 -5.5 -6.5 c0 -1.5 1.2 -2.5 2.7 -2.5 c1.2 0 2 .7 2.8 1.7 c.8 -1 1.6 -1.7 2.8 -1.7 c1.5 0 2.7 1 2.7 2.5 c0 2.5 -2.5 4 -5.5 6.5z`}
              fill={x === 228 ? 'var(--pink-line)' : 'var(--white)'}
            />
          </g>
        ))}
        <path d="M236 208 q3 -5 0 -9 M264 208 q3 -5 0 -9" fill="none" stroke="var(--pink-line)" strokeWidth={1.8} strokeLinecap="round" />
      </g>
    ),
  },
};

/** 飾りのアイコン（カード用） */
export function DecorIcon({ id, size = 64 }: { id: string; size?: number }) {
  const art = DECOR_ART[id];
  if (!art) return null;
  const [x, y, w, h] = art.box;
  const pad = 4;
  return (
    <svg viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`} width={size} height={size} aria-hidden="true">
      {art.draw()}
    </svg>
  );
}

/** ふたりのおへや全体 */
export function RoomScene({ placed, className }: { placed: string[]; className?: string }) {
  const has = (id: string) => placed.includes(id);
  const layer = (back: boolean) =>
    Object.entries(DECOR_ART)
      .filter(([id, a]) => a.back === back && has(id) && id !== 'rug' && id !== 'cushion')
      .map(([id, a]) => <g key={id}>{a.draw()}</g>);
  return (
    <svg viewBox="0 0 360 312" className={className} role="img" aria-label="ふたりのおへや">
      {/* かべ */}
      <rect x={0} y={0} width={360} height={200} fill="var(--pink-soft)" />
      <path d="M0 176 H360" stroke="var(--pink)" strokeWidth={6} />
      {/* 窓 */}
      <rect x={232} y={34} width={100} height={110} rx={8} fill="var(--white)" {...S} />
      <path d="M282 34 V144 M232 89 H332" {...S} />
      <path d="M244 64 q6 -8 14 -4 q6 -6 12 0 q8 0 6 6 h-32 z" fill="var(--pink)" />
      <path d="M294 116 q5 -6 11 -3 q5 -5 10 0 q6 0 5 5 h-26 z" fill="var(--pink)" />
      <path d="M226 144 H338" {...S} strokeWidth={4} />
      {/* 床 */}
      <rect x={0} y={200} width={360} height={112} fill="var(--white)" />
      <path d="M0 200 H360" {...S} />
      <path d="M0 224 H360 M0 252 H360 M0 282 H360 M60 200 L40 224 M150 224 L140 252 M250 200 L260 224 M320 224 L330 252 M90 252 L80 282 M280 252 L290 282" stroke="var(--pink)" strokeWidth={1.6} />
      {has('rug') && DECOR_ART.rug.draw()}
      {layer(true)}
      {has('cushion') && DECOR_ART.cushion.draw()}
      <CatSitting x={130} y={96} />
      {/* テーブル */}
      <path d="M62 244 V262 Q180 284 298 262 V244" fill="var(--pink)" {...S} />
      <ellipse cx={180} cy={244} rx={118} ry={18} fill="var(--white)" {...S} />
      <ellipse cx={180} cy={244} rx={104} ry={12} fill="none" stroke="var(--pink)" strokeWidth={2} />
      {layer(false)}
    </svg>
  );
}
