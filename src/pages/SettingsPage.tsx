import { useRef, useState } from 'react';
import { createEmptyData, normalizeData, useStore } from '../store';
import type { Profile } from '../types';
import { Field, PageHeader } from '../components/ui';

export default function SettingsPage() {
  const { data, update, replaceAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const setProfile = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    update((d) => ({ ...d, profile: { ...d.profile, [k]: v } }));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `futari-note-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = normalizeData(JSON.parse(await file.text()));
      if (!confirm('現在のデータを読み込んだデータで置き換えます。よろしいですか？')) return;
      replaceAll(parsed);
      setMsg('データを読み込みました');
    } catch {
      setMsg('ファイルの読み込みに失敗しました');
    }
  };

  return (
    <div className="stack">
      <PageHeader title="設定" />
      {msg && <div className="notice">{msg}</div>}

      <section className="card form">
        <h2>👫 ふたりのプロフィール</h2>
        <div className="grid-2">
          <Field label="自分の名前">
            <input value={data.profile.myName} onChange={(e) => setProfile('myName', e.target.value)} />
          </Field>
          <Field label="相手の名前">
            <input value={data.profile.partnerName} onChange={(e) => setProfile('partnerName', e.target.value)} />
          </Field>
        </div>
        <Field label="付き合った日">
          <input type="date" value={data.profile.startDate} onChange={(e) => setProfile('startDate', e.target.value)} />
        </Field>
      </section>

      <section className="card form">
        <h2>📅 Googleカレンダー連携</h2>
        <p className="muted small">
          Google Cloud Console で「OAuth クライアントID（ウェブアプリケーション）」を作成し、承認済みの JavaScript
          生成元にこのアプリのURL（例: {location.origin}）を追加してください。詳しくは README を参照。
        </p>
        <Field label="OAuth クライアントID">
          <input
            placeholder="xxxxxxxx.apps.googleusercontent.com"
            value={data.settings.googleClientId}
            onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, googleClientId: e.target.value } }))}
          />
        </Field>
        <Field label="共有カレンダーID（カレンダー画面から選択できます）">
          <input
            value={data.settings.sharedCalendarId}
            onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, sharedCalendarId: e.target.value } }))}
          />
        </Field>
      </section>

      <section className="card form">
        <h2>💾 データ</h2>
        <p className="muted small">
          データはこの端末のブラウザに保存されます。バックアップや、パートナーの端末への引き継ぎにはエクスポート/インポートを使ってください。
        </p>
        <div className="row wrap">
          <button className="btn" onClick={exportJson}>
            エクスポート
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            インポート
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('すべてのデータを削除します。元に戻せません。よろしいですか？')) replaceAll(createEmptyData());
            }}
          >
            全データ削除
          </button>
        </div>
      </section>
    </div>
  );
}
