import { Fragment, useState } from 'react';
import { useMe, useStore } from '../store';
import type { DecorState, Owner } from '../types';
import { COIN_RULES, DECOR, coinBalance, earnedCoins, isOwned, isPlaced, rankOf } from '../lib/room';
import { withActivity } from '../lib/activity';
import { RoomScene, DecorIcon } from '../components/art/Room';
import { Coin, RankDots } from '../components/Coin';

/** ふたりのおへや: コインで飾りを買って、部屋に飾る */
export default function RoomPage() {
  const { data, update } = useStore();
  const me = useMe();
  const by: Owner = me ?? 'both';
  const [hideUi, setHideUi] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const coins = coinBalance(data);
  const { rank, progress, step } = rankOf(earnedCoins(data));
  const placed = DECOR.filter((d) => isPlaced(data, d.id)).map((d) => d.id);

  const tap = (id: string) => {
    const item = DECOR.find((d) => d.id === id)!;
    if (isOwned(data, id)) {
      const now = !isPlaced(data, id);
      update((d) => {
        const exists = d.decor.some((x) => x.id === id);
        const decor: DecorState[] = exists
          ? d.decor.map((x) => (x.id === id ? { ...x, placed: now } : x))
          : [...d.decor, { id, placed: now, boughtBy: by, boughtAt: new Date().toISOString() }];
        return { ...d, decor };
      });
      setMessage(now ? `「${item.name}」を飾りました` : `「${item.name}」をしまいました`);
      return;
    }
    if (coins < item.price) {
      setMessage(`あと ${item.price - coins} コインで「${item.name}」が買えます`);
      return;
    }
    if (armed !== id) {
      setArmed(id);
      setMessage(`もう一度タップすると ${item.price} コインで「${item.name}」を買います`);
      return;
    }
    setArmed(null);
    update((d) =>
      withActivity(
        { ...d, decor: [...d.decor, { id, placed: true, boughtBy: by, boughtAt: new Date().toISOString() }] },
        me,
        `「${item.name}」を買っておへやに飾りました`,
        '/room',
      ),
    );
    setMessage(`「${item.name}」を買って飾りました！`);
  };

  return (
    <div className="stack">
      <div className="room-hero">
        <RoomScene placed={placed} className="room" />
        <div className="room-top">
          <span className="pill big">ふたりのおへや</span>
          <button
            className="square-btn"
            onClick={() => setHideUi((v) => !v)}
            aria-label={hideUi ? '表示を戻す' : 'おへやだけを見る'}
            aria-pressed={hideUi}
          >
            {hideUi ? '🙈' : '👁'}
          </button>
        </div>
        {!hideUi && (
          <div className="room-bottom">
            <span className="pill">
              Rank {rank} <RankDots progress={progress} step={step} /> {progress}/{step}
            </span>
            <span className="pill">🛋️ 飾り {placed.length}</span>
          </div>
        )}
      </div>

      <h2 className="sticker">手に入れた飾り</h2>
      {message && <div className="notice small">{message}</div>}
      <ul className="decor-grid">
        {DECOR.map((d) => {
          const owned = isOwned(data, d.id);
          const on = isPlaced(data, d.id);
          const locked = !owned && coins < d.price;
          return (
            <li key={d.id}>
              <button
                className={`decor-card ${locked ? 'locked' : ''} ${on ? 'placed' : ''} ${armed === d.id ? 'armed' : ''}`}
                onClick={() => tap(d.id)}
                aria-label={`${d.name}${owned ? (on ? '（飾っています）' : '（持っています）') : `（${d.price}コイン）`}`}
              >
                {on && <span className="decor-check">✓</span>}
                <DecorIcon id={d.id} size={64} />
                <span className="decor-name">{d.name}</span>
                {owned ? (
                  <span className="owned-pill">{on ? '飾ってるよ' : '買ったよ'}</span>
                ) : (
                  <span className="price-pill">
                    <Coin small />
                    {d.price}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="muted small" style={{ textAlign: 'center' }}>
        持っている飾りはタップで「飾る／しまう」を切り替えられます
      </p>

      <section className="card">
        <h2>コインのため方</h2>
        <div className="coin-rules">
          {COIN_RULES.map((r) => (
            <Fragment key={r.label}>
              <span>{r.label}</span>
              <span>+{r.coins}</span>
            </Fragment>
          ))}
        </div>
        <p className="muted small">コインはふたりで共通です。いっしょにためて、おへやを育てよう。</p>
      </section>
    </div>
  );
}
