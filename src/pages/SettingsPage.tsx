import WhoPicker from '../components/WhoPicker';
import { useRef, useState } from 'react';
import { createEmptyData, normalizeData, useStore } from '../store';
import type { AppData, Profile } from '../types';
import { ConfirmButton, Field, PageHeader } from '../components/ui';

export default function SettingsPage() {
  const { data, update, replaceAll, mode } = useStore();
  const cloud = mode !== 'local';
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);

  const setProfile = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    update((d) => ({ ...d, profile: { ...d.profile, [k]: v } }));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nyasu-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const readImport = async (file: File) => {
    try {
      setPendingImport(normalizeData(JSON.parse(await file.text())));
      setMsg('');
    } catch {
      setMsg('ファイルの読み込みに失敗しました');
    }
  };

  return (
    <div className="stack">
      <PageHeader title="設定" />
      {msg && <div className="notice">{msg}</div>}

      <section className="card">
        <h2>📱 この端末を使っているのは？</h2>
        <p className="muted small">コメント・質問ゲーム・更新履歴で「誰が」を表示するのに使います（端末ごとに保存）。</p>
        <WhoPicker compact />
      </section>

      <section className="card form">
        <h2>👫 ふたりのプロフィール</h2>
        {cloud && <p className="muted small">プロフィールはふたりで共有されます。</p>}
        <div className="grid-2">
          <Field label={cloud ? 'ひとり目の名前' : '自分の名前'}>
            <input id="p-me" value={data.profile.myName} onChange={(e) => setProfile('myName', e.target.value)} />
          </Field>
          <Field label={cloud ? 'ふたり目の名前' : '相手の名前'}>
            <input id="p-partner" value={data.profile.partnerName} onChange={(e) => setProfile('partnerName', e.target.value)} />
          </Field>
        </div>
        <Field label="付き合った日">
          <input id="p-start" type="date" value={data.profile.startDate} onChange={(e) => setProfile('startDate', e.target.value)} />
        </Field>
      </section>

      {cloud ? (
        <section className="card">
          <h2>☁️ ふたりで共有する</h2>
          <p className="small">
            このアプリのデータはクラウドに保存され、開いている人の間でリアルタイムに共有されます。パートナーを招待するには、画面右上の共有メニューからパートナーのメールアドレスを
            <strong>編集者</strong>として追加してください（パートナーも claude.ai へのログインが必要です）。
          </p>
          <p className="muted small">サプライズにしたお祝い準備は、作った人にだけ表示されます。</p>
        </section>
      ) : (
        <section className="card form">
          <h2>📅 Googleカレンダー連携</h2>
          <p className="muted small">
            Google Cloud Console で「OAuth クライアントID（ウェブアプリケーション）」を作成し、承認済みの JavaScript
            生成元にこのアプリのURL（例: {location.origin}）を追加してください。詳しくは README を参照。
          </p>
          <Field label="OAuth クライアントID">
            <input
              id="g-client"
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              value={data.settings.googleClientId}
              onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, googleClientId: e.target.value } }))}
            />
          </Field>
          <Field label="共有カレンダーID（カレンダー画面から選択できます）">
            <input
              id="g-cal"
              value={data.settings.sharedCalendarId}
              onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, sharedCalendarId: e.target.value } }))}
            />
          </Field>
        </section>
      )}

      <section className="card form">
        <h2>💾 データ</h2>
        <p className="muted small">
          {cloud
            ? 'ローカル版でエクスポートしたファイルを読み込んで、クラウドに引き継げます。'
            : 'データはこの端末のブラウザに保存されます。バックアップや、パートナーの端末への引き継ぎにはエクスポート/インポートを使ってください。'}
        </p>
        <div className="row wrap">
          {!cloud && (
            <button className="btn" onClick={exportJson}>
              エクスポート
            </button>
          )}
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
              if (f) readImport(f);
              e.target.value = '';
            }}
          />
          <ConfirmButton
            className="btn danger"
            confirmLabel="もう一度押すと全データを削除"
            onConfirm={() => {
              replaceAll({ ...createEmptyData(), settings: data.settings });
              setMsg('すべてのデータを削除しました');
            }}
          >
            全データ削除
          </ConfirmButton>
        </div>
        {pendingImport && (
          <div className="notice row wrap">
            <span className="grow">
              読み込んだデータ（やりたいこと {pendingImport.todos.length}件・記念日 {pendingImport.anniversaries.length}件・Vlog{' '}
              {pendingImport.vlogs.length}件）で現在のデータを置き換えます。
            </span>
            <button className="btn small" onClick={() => setPendingImport(null)}>
              やめる
            </button>
            <button
              className="btn small primary"
              onClick={() => {
                replaceAll({ ...pendingImport, settings: data.settings });
                setPendingImport(null);
                setMsg('データを読み込みました');
              }}
            >
              置き換える
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
