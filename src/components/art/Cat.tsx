import { useEffect, useState } from 'react';
import { CAT, CAT_STEP, Sprite } from './pixel';

/** 歩くネコ（2コマを交互に表示） */
export function RunningCat({ width = 96 }: { width?: number }) {
  const [step, setStep] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setStep((s) => !s), 260);
    return () => clearInterval(t);
  }, []);
  return <Sprite rows={step ? CAT_STEP : CAT} size={width} className="walking-cat" label="歩く黒ネコ" />;
}
