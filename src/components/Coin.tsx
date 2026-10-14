import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { coinBalance } from '../lib/room';

export function Coin({ small = false }: { small?: boolean }) {
  return (
    <span className={`coin ${small ? 'small' : ''}`} aria-hidden="true">
      ♡
    </span>
  );
}

/** 所持コイン（タップでおへやへ） */
export function CoinPill() {
  const { data } = useStore();
  const coins = coinBalance(data);
  return (
    <Link to="/room" className="coin-pill" aria-label={`コイン ${coins}枚。おへやを開く`}>
      <Coin />
      {coins.toLocaleString()}
    </Link>
  );
}

/** ランクの進み具合（5つの丸） */
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
