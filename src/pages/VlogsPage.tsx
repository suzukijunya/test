import { useState } from 'react';
import { useStore } from '../store';
import type { Vlog, VlogStatus } from '../types';
import { newId } from '../lib/id';
import { formatJa } from '../lib/dates';
import { thumbnailFor } from '../lib/youtube';
import { ConfirmButton, Empty, Field, Modal, PageHeader } from '../components/ui';

export const VLOG_STATUS: Record<VlogStatus, string> = {
  idea: '💡 企画',
  shooting: '🎥 撮影',
  editing: '✂️ 編集中',
  published: '🚀 公開済',
};
const STATUSES = Object.keys(VLOG_STATUS) as VlogStatus[];

function blank(): Vlog {
  return {
    id: '',
    title: '',
    status: 'idea',
    shootDate: '',
    publishDate: '',
    location: '',
    url: '',
    thumbnailUrl: '',
    tags: [],
    memo: '',
    shotList: [],
    createdAt: '',
  };
}

export default function VlogsPage() {
  const { data, update } = useStore();
  const [filter, setFilter] = useState<VlogStatus | 'all'>('all');
  const [tag, setTag] = useState('');
  const [editing, setEditing] = useState<Vlog | null>(null);

  const allTags = [...new Set(data.vlogs.flatMap((v) => v.tags))];
  const visible = data.vlogs
    .filter((v) => filter === 'all' || v.status === filter)
    .filter((v) => !tag || v.tags.includes(tag))
    .sort((a, b) => (b.shootDate || b.createdAt).localeCompare(a.shootDate || a.createdAt));
  const counts = Object.fromEntries(STATUSES.map((s) => [s, data.vlogs.filter((v) => v.status === s).length]));

  const save = (v: Vlog) => {
    update((d) =>
      v.id
        ? { ...d, vlogs: d.vlogs.map((x) => (x.id === v.id ? v : x)) }
        : { ...d, vlogs: [...d.vlogs, { ...v, id: newId(), createdAt: new Date().toISOString() }] },
    );
    setEditing(null);
  };
  const remove = (id: string) => {
    update((d) => ({ ...d, vlogs: d.vlogs.filter((v) => v.id !== id) }));
    setEditing(null);
  };
  const setStatus = (id: string, status: VlogStatus) =>
    update((d) => ({ ...d, vlogs: d.vlogs.map((v) => (v.id === id ? { ...v, status } : v)) }));

  return (
    <div className="stack">
      <PageHeader
        title="Vlog管理"
        sub="ふたりのVlogを企画から公開まで管理"
        action={
          <button className="btn primary" onClick={() => setEditing(blank())}>
            ＋ 新しいVlog
          </button>
        }
      />
      <div className="toolbar">
        <div className="seg scroll">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            すべて {data.vlogs.length}
          </button>
          {STATUSES.map((s) => (
            <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
              {VLOG_STATUS[s]} {counts[s]}
            </button>
          ))}
        </div>
        {allTags.length > 0 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">すべてのタグ</option>
            {allTags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {visible.length === 0 ? (
        <Empty>撮りたいVlogのアイデアを追加しましょう</Empty>
      ) : (
        <ul className="vlog-grid">
          {visible.map((v) => {
            const thumb = v.thumbnailUrl || (v.url && thumbnailFor(v.url));
            const shots = v.shotList.length;
            const shotsDone = v.shotList.filter((s) => s.done).length;
            return (
              <li key={v.id} className="card vlog">
                <button className="thumb" onClick={() => setEditing(v)} aria-label={`${v.title}を編集`}>
                  <Thumb src={thumb || ''} />
                </button>
                <div className="vlog-body">
                  <div className="todo-title">{v.title}</div>
                  <div className="meta">
                    {v.shootDate && <span className="muted small">撮影 {formatJa(v.shootDate)}</span>}
                    {v.location && <span className="muted small">📍{v.location}</span>}
                  </div>
                  <div className="meta">
                    {v.tags.map((t) => (
                      <span key={t} className="tag">
                        #{t}
                      </span>
                    ))}
                  </div>
                  {shots > 0 && (
                    <div className="muted small">
                      撮影リスト {shotsDone}/{shots}
                    </div>
                  )}
                  <div className="row">
                    <select
                      className={`status status-${v.status}`}
                      value={v.status}
                      onChange={(e) => setStatus(v.id, e.target.value as VlogStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {VLOG_STATUS[s]}
                        </option>
                      ))}
                    </select>
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noreferrer" className="small">
                        ▶ 見る
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <VlogForm
          item={editing}
          onSave={save}
          onDelete={editing.id ? () => remove(editing.id) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function VlogForm({
  item,
  onSave,
  onDelete,
  onClose,
}: {
  item: Vlog;
  onSave: (v: Vlog) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [f, setF] = useState(item);
  const [tagText, setTagText] = useState(item.tags.join(', '));
  const [shot, setShot] = useState('');
  const set = <K extends keyof Vlog>(k: K, v: Vlog[K]) => setF((p) => ({ ...p, [k]: v }));

  const addShot = () => {
    if (!shot.trim()) return;
    set('shotList', [...f.shotList, { id: newId(), title: shot.trim(), done: false }]);
    setShot('');
  };

  return (
    <Modal title={item.id ? 'Vlogを編集' : '新しいVlog'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.title.trim()) return;
          const tags = [...new Set(tagText.split(/[,、\s]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean))];
          onSave({ ...f, title: f.title.trim(), tags });
        }}
      >
        <Field label="タイトル">
          <input autoFocus required value={f.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label="ステータス">
            <select value={f.status} onChange={(e) => set('status', e.target.value as VlogStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VLOG_STATUS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="場所">
            <input value={f.location} onChange={(e) => set('location', e.target.value)} />
          </Field>
          <Field label="撮影日">
            <input type="date" value={f.shootDate} onChange={(e) => set('shootDate', e.target.value)} />
          </Field>
          <Field label="公開日">
            <input type="date" value={f.publishDate} onChange={(e) => set('publishDate', e.target.value)} />
          </Field>
        </div>
        <Field label="動画URL（YouTubeならサムネイル自動表示）">
          <input type="url" value={f.url} onChange={(e) => set('url', e.target.value)} />
        </Field>
        <Field label="サムネイル画像URL（任意）">
          <input type="url" value={f.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} />
        </Field>
        <Field label="タグ（カンマ区切り 例: 旅行, 京都）">
          <input value={tagText} onChange={(e) => setTagText(e.target.value)} />
        </Field>

        <div className="field">
          <span>撮影リスト（撮りたいカット）</span>
          <ul className="list">
            {f.shotList.map((s) => (
              <li key={s.id} className={`row ${s.done ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={() =>
                    set(
                      'shotList',
                      f.shotList.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)),
                    )
                  }
                />
                <span className="grow">{s.title}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="削除"
                  onClick={() => set('shotList', f.shotList.filter((x) => x.id !== s.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="inline-form">
            <input
              placeholder="例: オープニングの自撮り"
              value={shot}
              onChange={(e) => setShot(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addShot();
                }
              }}
            />
            <button type="button" className="btn" onClick={addShot}>
              追加
            </button>
          </div>
        </div>

        <Field label="構成・メモ">
          <textarea rows={4} value={f.memo} onChange={(e) => set('memo', e.target.value)} />
        </Field>
        <div className="form-actions">
          {onDelete && (
            <ConfirmButton className="btn danger" onConfirm={onDelete}>
              削除
            </ConfirmButton>
          )}
          <span className="grow" />
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

/** 外部画像が読み込めない環境（埋め込み表示など）ではアイコンを表示 */
function Thumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span>🎬</span>;
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
