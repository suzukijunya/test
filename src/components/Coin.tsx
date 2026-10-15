import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { coinBalance } from '../lib/room';
import { COIN, Sprite } from './art/pixel';

export function Coin({ small = false }: { small?: boolean }) {
  return <Sprite rows={COIN} size={small ? 12 : 16} className="coin" />;
}

/** 所持ゴールド（タップでおへやへ） */
export function CoinPill() {
  const { data } = useStore();
  const coins = coinBalance(data);
  return (
    <Link to="/room" className="coin-pill" aria-label={`${coins}ゴールド。おへやを開く`}>
      <Coin />
      {coins.toLocaleString()}
      <span className="unit">G</span>
    </Link>
  );
}

/** 次のレベルまでのけいけんち（5マス） */
export function RankDots({ progress, step }: { progress: number; step: number }) {
  const on = Math.floor((progress / step) * 5);
  return (
    <span className="rank-dots" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < on ? 'on' : ''} />
      ))}
    </span>
  );
}
