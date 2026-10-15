import { useStore } from '../store';

/** この端末を使っているのはどちらかを選ぶ（コメント・ゲーム・更新履歴の「誰が」に使う） */
export default function WhoPicker({ compact = false }: { compact?: boolean }) {
  const { data, update } = useStore();
  const { myName, partnerName } = data.profile;
  const set = (whoAmI: 'me' | 'partner') => update((d) => ({ ...d, settings: { ...d.settings, whoAmI } }));
  return (
    <div className={compact ? 'row wrap' : 'card highlight'}>
      {!compact && <h2>この端末を使っているのは？</h2>}
      {!compact && <p className="muted small">コメントや質問ゲームで「誰が」を表示するために使います（端末ごとに保存）。</p>}
      <div className="who-pick">
        <button className={`btn ${data.settings.whoAmI === 'me' ? 'primary' : ''}`} onClick={() => set('me')}>
          {myName || 'ひとり目'}
        </button>
        <button className={`btn ${data.settings.whoAmI === 'partner' ? 'primary' : ''}`} onClick={() => set('partner')}>
          {partnerName || 'ふたり目'}
        </button>
      </div>
    </div>
  );
}
