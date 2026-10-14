import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOwnerLabel, useStore } from '../store';
import type { Owner, TodoItem, TodoKind } from '../types';
import { newId } from '../lib/id';
import { formatJa, toDateString } from '../lib/dates';
import { ConfirmButton, Empty, Field, Modal, PageHeader } from '../components/ui';

function blank(kind: TodoKind): TodoItem {
  return {
    id: '',
    kind,
    title: '',
    category: '',
    url: '',
    address: '',
    memo: '',
    owner: 'both',
    dueDate: '',
    done: false,
    doneAt: '',
    createdAt: '',
  };
}

export default function TodosPage() {
  const { data, update } = useStore();
  const ownerLabel = useOwnerLabel();
  const [params, setParams] = useSearchParams();
  const kind: TodoKind = params.get('tab') === 'task' ? 'task' : 'place';
  const [showDone, setShowDone] = useState(false);
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<TodoItem | null>(null);

  const items = data.todos.filter((t) => t.kind === kind);
  const categories = [...new Set(items.map((t) => t.category).filter(Boolean))];
  const visible = items
    .filter((t) => t.done === showDone)
    .filter((t) => !category || t.category === category)
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || b.createdAt.localeCompare(a.createdAt));

  const save = (item: TodoItem) => {
    update((d) => {
      if (item.id) return { ...d, todos: d.todos.map((t) => (t.id === item.id ? item : t)) };
      return { ...d, todos: [...d.todos, { ...item, id: newId(), createdAt: new Date().toISOString() }] };
    });
    setEditing(null);
  };
  const toggle = (id: string) =>
    update((d) => ({
      ...d,
      todos: d.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done, doneAt: t.done ? '' : toDateString(new Date()) } : t,
      ),
    }));
  const remove = (id: string) => {
    update((d) => ({ ...d, todos: d.todos.filter((t) => t.id !== id) }));
  };

  const isPlace = kind === 'place';

  return (
    <div className="stack">
      <PageHeader
        title="やりたいことリスト"
        sub="行きたいお店や、ふたりでやることを管理"
        action={
          <button className="btn primary" onClick={() => setEditing(blank(kind))}>
            ＋ 追加
          </button>
        }
      />
      <div className="tabs">
        <button className={isPlace ? 'active' : ''} onClick={() => setParams({ tab: 'place' })}>
          🍽 行きたいお店
        </button>
        <button className={!isPlace ? 'active' : ''} onClick={() => setParams({ tab: 'task' })}>
          ✅ タスク
        </button>
      </div>
      <div className="toolbar">
        <div className="seg">
          <button className={!showDone ? 'active' : ''} onClick={() => setShowDone(false)}>
            {isPlace ? 'まだ' : '未完了'}
          </button>
          <button className={showDone ? 'active' : ''} onClick={() => setShowDone(true)}>
            {isPlace ? '行った' : '完了'}
          </button>
        </div>
        {categories.length > 0 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">すべての{isPlace ? 'ジャンル' : 'カテゴリ'}</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {visible.length === 0 ? (
        <Empty>{showDone ? 'まだありません' : isPlace ? '行きたいお店を追加しましょう' : 'タスクを追加しましょう'}</Empty>
      ) : (
        <ul className="cards">
          {visible.map((t) => (
            <li key={t.id} className={`card todo ${t.done ? 'done' : ''}`}>
              <div className="row">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} aria-label="完了" />
                <div className="grow">
                  <div className="todo-title">{t.title}</div>
                  <div className="meta">
                    {t.category && <span className="tag">{t.category}</span>}
                    <span className="tag owner">{ownerLabel(t.owner)}</span>
                    {t.dueDate && <span className="muted small">期限 {formatJa(t.dueDate)}</span>}
                    {t.done && t.doneAt && (
                      <span className="muted small">
                        {isPlace ? '行った日' : '完了'} {formatJa(t.doneAt)}
                      </span>
                    )}
                  </div>
                  {t.memo && <p className="memo">{t.memo}</p>}
                  <div className="links">
                    {t.url && (
                      <a href={t.url} target="_blank" rel="noreferrer">
                        🔗 リンク
                      </a>
                    )}
                    {isPlace && (t.address || t.title) && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.address || t.title)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📍 地図
                      </a>
                    )}
                  </div>
                </div>
                <div className="actions">
                  <button className="icon-btn" onClick={() => setEditing(t)} aria-label="編集">
                    ✏️
                  </button>
                  <ConfirmButton className="icon-btn" confirmLabel="削除？" ariaLabel="削除" onConfirm={() => remove(t.id)}>
                    🗑
                  </ConfirmButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <TodoForm item={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TodoForm({ item, onSave, onClose }: { item: TodoItem; onSave: (t: TodoItem) => void; onClose: () => void }) {
  const ownerLabel = useOwnerLabel();
  const [f, setF] = useState(item);
  const set = <K extends keyof TodoItem>(k: K, v: TodoItem[K]) => setF((p) => ({ ...p, [k]: v }));
  const isPlace = f.kind === 'place';
  return (
    <Modal title={item.id ? '編集' : isPlace ? '行きたいお店を追加' : 'タスクを追加'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (f.title.trim()) onSave({ ...f, title: f.title.trim() });
        }}
      >
        <Field label={isPlace ? '店名' : 'タスク'}>
          <input autoFocus required value={f.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label={isPlace ? 'ジャンル（例: カフェ、焼肉）' : 'カテゴリ（例: 旅行、家事）'}>
          <input value={f.category} onChange={(e) => set('category', e.target.value)} />
        </Field>
        {isPlace && (
          <Field label="住所・エリア">
            <input value={f.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        )}
        <Field label="URL（食べログ・Instagramなど）">
          <input type="url" value={f.url} onChange={(e) => set('url', e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label="担当">
            <select value={f.owner} onChange={(e) => set('owner', e.target.value as Owner)}>
              {(['both', 'me', 'partner'] as Owner[]).map((o) => (
                <option key={o} value={o}>
                  {ownerLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={isPlace ? '行きたい時期' : '期限'}>
            <input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>
        <Field label="メモ">
          <textarea rows={3} value={f.memo} onChange={(e) => set('memo', e.target.value)} />
        </Field>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="btn primary">
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}
