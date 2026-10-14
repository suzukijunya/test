/** nyasu のロゴマーク: 薄いピンクの猫の顔（耳がハートの形） */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo">
      <path d="M5 13 L6.5 3.5 L13 8.5 Z" fill="var(--pink-line)" />
      <path d="M27 13 L25.5 3.5 L19 8.5 Z" fill="var(--pink-line)" />
      <ellipse cx="16" cy="17.5" rx="12" ry="10.5" fill="var(--pink)" />
      <circle cx="11.5" cy="16.5" r="1.4" fill="var(--text)" />
      <circle cx="20.5" cy="16.5" r="1.4" fill="var(--text)" />
      <path d="M14.6 20.2 Q16 21.6 17.4 20.2" stroke="var(--text)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M16 23.6 c-1.2-1-2.4-1.7-2.4-2.7 0-.7.6-1.1 1.2-1.1.5 0 .9.3 1.2.7.3-.4.7-.7 1.2-.7.6 0 1.2.4 1.2 1.1 0 1-1.2 1.7-2.4 2.7z" fill="var(--white)" transform="translate(0 2.2) scale(1)" />
    </svg>
  );
}
