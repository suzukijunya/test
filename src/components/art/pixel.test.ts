import { describe, expect, it } from 'vitest';
import { CAT, CAT_BLINK, CAT_STEP, COIN, DECOR_SPRITES, HEART, PALETTE, WINDOW } from './pixel';
import { DECOR } from '../../lib/room';

describe('ドット絵', () => {
  const all = { CAT, CAT_BLINK, CAT_STEP, COIN, HEART, WINDOW, ...DECOR_SPRITES };
  it.each(Object.entries(all))('%s は横幅がそろい、パレットの色だけを使う', (_, rows) => {
    const w = rows[0].length;
    for (const r of rows) {
      expect(r.length).toBe(w);
      for (const ch of r) expect(ch === '.' || ch in PALETTE).toBe(true);
    }
  });
  it('すべての飾りに絵がある', () => {
    for (const d of DECOR) expect(DECOR_SPRITES[d.id]).toBeDefined();
  });
});
