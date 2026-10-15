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
      setMessage(now ? `「${item.name}」を かざった。` : `「${item.name}」を しまった。`);
      return;
    }
    if (coins < item.price) {
      setMessage(`ゴールドが たりないようだ。あと ${item.price - coins}G で「${item.name}」が かえる。`);
      return;
    }
    if (armed !== id) {
      setArmed(id);
      setMessage(`「${item.name}」は ${item.price}G だ。かうなら もういちど タップしてくれ。`);
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
    setMessage(`まいどあり！ 「${item.name}」を てにいれた！`);
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
            {hideUi ? 'もどす' : 'みる'}
          </button>
        </div>
        {!hideUi && (
          <div className="room-bottom">
            <span className="pill">
              Lv {rank} <RankDots progress={progress} step={step} /> {progress}/{step}
            </span>
            <span className="pill">かざり {placed.length}</span>
          </div>
        )}
      </div>

      <div className="notice shop-message" role="status">
        {message || 'いらっしゃい！ かざりの みせへ ようこそ。 なにを かうかね？'}
      </div>
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
                aria-label={`${d.name}${owned ? (on ? '（飾っています）' : '（持っています）') : `（${d.price}ゴールド）`}`}
              >
                {on && (
                  <span className="decor-check" aria-hidden="true">
                    E
                  </span>
                )}
                <span className="icon">
                  <DecorIcon id={d.id} size={56} />
                </span>
                <span className="decor-name">{d.name}</span>
                {owned ? (
                  <span className="owned-pill">{on ? 'かざっている' : 'もっている'}</span>
                ) : (
                  <span className="price-pill">
                    <Coin small />
                    {d.price}G
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="muted small" style={{ textAlign: 'center' }}>
        E は かざっている しるし。もっている かざりは タップで かざる／しまう を きりかえられます
      </p>

      <section className="card">
        <h2>ゴールドの かせぎかた</h2>
        <div className="coin-rules">
          {COIN_RULES.map((r) => (
            <Fragment key={r.label}>
              <span>{r.label}</span>
              <span>+{r.coins}</span>
            </Fragment>
          ))}
        </div>
        <p className="muted small">ゴールドは ふたりで きょうつう。100G かせぐごとに レベルが あがります。</p>
      </section>
    </div>
  );
}
