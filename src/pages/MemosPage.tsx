import { useState } from 'react';
import { useMe, useOwnerLabel, useStore } from '../store';
import type { Memo } from '../types';
import { newId } from '../lib/id';
import { timeAgo, withActivity } from '../lib/activity';
import { ConfirmButton, Empty, Field, Modal, PageHeader } from '../components/ui';
import { ScheduleTabs } from './CalendarPage';

function blank(): Memo {
  return { id: '', title: '', body: '', pinned: false, author: 'both', updatedAt: '' };
}

/** ふたりの共有メモ（TimeTreeのメモ風）: 旅行の持ち物、プレゼント案、合鍵の場所など */
export default function MemosPage() {
  const { data, update } = useStore();
  const ownerLabel = useOwnerLabel();
  const me = useMe();
  const [editing, setEditing] = useState<Memo | null>(null);

  const memos = [...data.memos].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  );

  const save = (m: Memo) => {
    const isNew = !m.id;
    const memo = { ...m, id: m.id || newId(), author: me ?? m.author, updatedAt: new Date().toISOString() };
    update((d) =>
      withActivity(
        { ...d, memos: isNew ? [...d.memos, memo] : d.memos.map((x) => (x.id === memo.id ? memo : x)) },
        me,
        `メモ「${memo.title || '無題'}」を${isNew ? '作成' : '更新'}しました`,
        '/memos',
      ),
    );
    setEditing(null);
  };
  const remove = (id: string) => {
    update((d) => ({ ...d, memos: d.memos.filter((m) => m.id !== id) }));
    setEditing(null);
  };
  const togglePin = (m: Memo) =>
    update((d) => ({ ...d, memos: d.memos.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)) }));

  return (
    <div className="stack">
      <ScheduleTabs />
      <PageHeader
        title="ふたりのメモ"
        sub="旅行の持ち物、欲しいもの、合言葉…ふたりで共有できるメモ"
        action={
          <button className="btn primary" onClick={() => setEditing(blank())}>
            ＋ メモ
          </button>
        }
      />
      {memos.length === 0 ? (
        <Empty>旅行の持ち物リストや、お互いの好きなものメモを作ってみましょう</Empty>
      ) : (
        <ul className="memo-grid">
          {memos.map((m) => (
            <li key={m.id} className={`card memo-card ${m.pinned ? 'pinned' : ''}`}>
              <div className="row">
                <strong className="grow" onClick={() => setEditing(m)}>
                  {m.title || '無題'}
                </strong>
                <button className="icon-btn" aria-label={m.pinned ? 'ピンを外す' : 'ピン留め'} onClick={() => togglePin(m)}>
                  {m.pinned ? '📌' : '📍'}
                </button>
              </div>
              <div className="memo-body" onClick={() => setEditing(m)}>
                {m.body}
              </div>
              <span className="muted small">
                {ownerLabel(m.author)}・{timeAgo(m.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <Modal title={editing.id ? 'メモを編集' : '新しいメモ'} onClose={() => setEditing(null)}>
          <MemoForm memo={editing} onSave={save} onDelete={editing.id ? () => remove(editing.id) : undefined} />
        </Modal>
      )}
    </div>
  );
}

function MemoForm({ memo, onSave, onDelete }: { memo: Memo; onSave: (m: Memo) => void; onDelete?: () => void }) {
  const [f, setF] = useState(memo);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.title.trim() || f.body.trim()) onSave({ ...f, title: f.title.trim() });
      }}
    >
      <Field label="タイトル">
        <input id="memo-title" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </Field>
      <Field label="内容">
        <textarea id="memo-body" rows={8} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      </Field>
      <label className="check">
        <input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} />
        📌 上に固定する
      </label>
      <div className="form-actions">
        {onDelete && (
          <ConfirmButton className="btn danger" onConfirm={onDelete}>
            削除
          </ConfirmButton>
        )}
        <span className="grow" />
        <button type="submit" className="btn primary">
          保存
        </button>
      </div>
    </form>
  );
}
