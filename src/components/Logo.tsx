import { CAT, Sprite } from './art/pixel';

/** nyasu のロゴマーク: ドット絵の黒ネコ */
export default function Logo({ size = 30 }: { size?: number }) {
  return <Sprite rows={CAT} size={size} className="logo" />;
}
