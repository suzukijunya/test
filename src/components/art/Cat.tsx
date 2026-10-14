/** nyasu のマスコット: ピンクのバンダナをした黒ネコ */
const S = { stroke: 'var(--ink)', strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Face({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* 目 */}
      <ellipse cx={cx - 10} cy={cy} rx={5.2} ry={6} fill="var(--white)" />
      <ellipse cx={cx + 10} cy={cy} rx={5.2} ry={6} fill="var(--white)" />
      <circle cx={cx - 9.4} cy={cy + 0.8} r={3.4} fill="var(--ink)" />
      <circle cx={cx + 10.6} cy={cy + 0.8} r={3.4} fill="var(--ink)" />
      <circle cx={cx - 8.2} cy={cy - 0.8} r={1.2} fill="var(--white)" />
      <circle cx={cx + 11.8} cy={cy - 0.8} r={1.2} fill="var(--white)" />
      {/* ほっぺ */}
      <ellipse cx={cx - 17} cy={cy + 8} rx={4.5} ry={2.8} fill="var(--pink-line)" />
      <ellipse cx={cx + 17} cy={cy + 8} rx={4.5} ry={2.8} fill="var(--pink-line)" />
      {/* 鼻と口 */}
      <path d={`M${cx - 2.2} ${cy + 5.5} h4.4 l-2.2 2.6 z`} fill="var(--pink-line)" />
      <path
        d={`M${cx - 4} ${cy + 9.5} q2 2 4 0 q2 2 4 0`}
        fill="none"
        stroke="var(--pink-line)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </g>
  );
}

function Whiskers({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g stroke="var(--ink)" strokeWidth={1.5} strokeLinecap="round">
      <path d={`M${cx - 26} ${cy + 4} l-10 -2 M${cx - 26} ${cy + 8} l-10 2`} />
      <path d={`M${cx + 26} ${cy + 4} l10 -2 M${cx + 26} ${cy + 8} l10 2`} />
    </g>
  );
}

/** おすわりしているネコ（viewBox 0 0 100 112） */
export function SittingCat({ width = 100, className }: { width?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 112" width={width} className={className} role="img" aria-label="黒ネコ">
      <CatSitting x={0} y={0} />
    </svg>
  );
}

/** シーンに置くための <g> 版 */
export function CatSitting({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* しっぽ */}
      <path d="M72 98 C92 96 96 76 86 66" fill="none" stroke="var(--ink)" strokeWidth={8} strokeLinecap="round" />
      {/* からだ */}
      <path d="M28 108 C22 84 30 62 50 60 C70 62 78 84 72 108 Z" fill="var(--ink)" {...S} />
      {/* 前足 */}
      <ellipse cx={41} cy={106} rx={7.5} ry={5} fill="var(--ink)" />
      <ellipse cx={59} cy={106} rx={7.5} ry={5} fill="var(--ink)" />
      <path d="M39 106 v3 M43 106 v3 M57 106 v3 M61 106 v3" stroke="var(--pink-line)" strokeWidth={1.3} strokeLinecap="round" />
      {/* 耳 */}
      <path d="M24 36 L22 8 L44 24 Z" fill="var(--ink)" {...S} />
      <path d="M76 36 L78 8 L56 24 Z" fill="var(--ink)" {...S} />
      <path d="M27 30 L26 15 L38 24 Z" fill="var(--pink-line)" />
      <path d="M73 30 L74 15 L62 24 Z" fill="var(--pink-line)" />
      {/* あたま */}
      <ellipse cx={50} cy={40} rx={29} ry={24} fill="var(--ink)" {...S} />
      <Whiskers cx={50} cy={42} />
      <Face cx={50} cy={40} />
      {/* バンダナ */}
      <path d="M30 60 Q50 70 70 60 L66 68 Q50 76 34 68 Z" fill="var(--pink)" {...S} />
      <path d="M44 68 L50 84 L57 68 Z" fill="var(--pink)" {...S} />
    </g>
  );
}

/** 走っているネコ（読み込み中に使う） */
export function RunningCat({ width = 150 }: { width?: number }) {
  return (
    <svg viewBox="0 0 150 86" width={width} role="img" aria-label="走る黒ネコ" className="running-cat">
      {/* しっぽ */}
      <path d="M30 46 C14 44 8 30 16 22" fill="none" stroke="var(--ink)" strokeWidth={8} strokeLinecap="round" />
      {/* 後ろ足 */}
      <path d="M38 56 L18 70" stroke="var(--ink)" strokeWidth={10} strokeLinecap="round" />
      <path d="M50 60 L40 76" stroke="var(--ink)" strokeWidth={10} strokeLinecap="round" />
      {/* からだ */}
      <ellipse cx={62} cy={50} rx={34} ry={18} fill="var(--ink)" {...S} />
      {/* 前足 */}
      <path d="M86 58 L112 70" stroke="var(--ink)" strokeWidth={10} strokeLinecap="round" />
      <path d="M78 62 L92 78" stroke="var(--ink)" strokeWidth={10} strokeLinecap="round" />

      {/* 耳とあたま */}
      <path d="M90 22 L90 0 L106 14 Z" fill="var(--ink)" {...S} />
      <path d="M122 22 L130 2 L136 22 Z" fill="var(--ink)" {...S} />
      <path d="M93 16 L93 7 L101 14 Z" fill="var(--pink-line)" />
      <path d="M126 18 L130 8 L133 18 Z" fill="var(--pink-line)" />
      <ellipse cx={112} cy={30} rx={25} ry={20} fill="var(--ink)" {...S} />
      <Face cx={114} cy={28} />
      {/* バンダナ（なびく） */}
      <path d="M92 40 Q98 50 106 49 L100 42 Z" fill="var(--pink)" {...S} />
      <path d="M94 44 L74 34 L78 48 Z" fill="var(--pink)" {...S} />
    </svg>
  );
}
