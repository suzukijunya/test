import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import CalendarPage from './pages/CalendarPage';
import MemosPage from './pages/MemosPage';
import TodosPage from './pages/TodosPage';
import AnniversariesPage from './pages/AnniversariesPage';
import CelebrationsPage from './pages/CelebrationsPage';
import GamePage from './pages/GamePage';
import VlogsPage from './pages/VlogsPage';
import SettingsPage from './pages/SettingsPage';
import { useStore } from './store';
import Logo from './components/Logo';
import RoomPage from './pages/RoomPage';
import { CoinPill } from './components/Coin';
import { RunningCat } from './components/art/Cat';

/** mobile: false のものはスマホの下部タブに出さない（各画面のタブや右上から開く） */
const NAV = [
  { to: '/', label: 'ホーム', short: 'ホーム', icon: '🏠', mobile: true },
  { to: '/calendar', label: 'カレンダー・メモ', short: '予定', icon: '📅', mobile: true },
  { to: '/todos', label: 'やりたいこと', short: 'やりたい', icon: '📝', mobile: true },
  { to: '/anniversaries', label: '記念日', short: '記念日', icon: '🎂', mobile: true },
  { to: '/celebrations', label: 'お祝い準備', short: '準備', icon: '🎁', mobile: false },
  { to: '/game', label: '質問ゲーム', short: 'ゲーム', icon: '💭', mobile: true },
  { to: '/vlogs', label: 'Vlog', short: 'Vlog', icon: '🎬', mobile: true },
  { to: '/room', label: 'ふたりのおへや', short: 'おへや', icon: '🛋️', mobile: false },
  { to: '/settings', label: '設定', short: '設定', icon: '⚙️', mobile: false },
];

const SYNC_LABEL = { local: 'この端末に保存', connecting: '接続中…', cloud: 'ふたりで共有中' } as const;

export default function App() {
  const { mode, syncError } = useStore();
  if (mode === 'connecting') {
    return (
      <div className="loading-screen" role="status">
        <p>おへやを準備しているよ。待っててね</p>
        <RunningCat width={160} />
        <div className="progress">
          <div />
        </div>
      </div>
    );
  }
  return (
    <div className="layout">
      <header className="topbar">
        <Link to="/" className="brand">
          <Logo />
          <span className="brand-name">nyasu</span>
        </Link>
        <div className="topbar-right">
          <span className={`sync sync-${mode}`}>{SYNC_LABEL[mode]}</span>
          <CoinPill />
          <Link to="/settings" className="square-btn" aria-label="設定">
            ⚙️
          </Link>
        </div>
      </header>
      <nav className="nav">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => [isActive ? 'active' : '', n.mobile ? '' : 'desktop-only'].join(' ')}
          >
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
            <span className="nav-short">{n.short}</span>
          </NavLink>
        ))}
      </nav>
      <main className="main">
        {syncError && <div className="notice error">{syncError}</div>}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/memos" element={<MemosPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/anniversaries" element={<AnniversariesPage />} />
          <Route path="/celebrations" element={<CelebrationsPage />} />
          <Route path="/celebrations/:id" element={<CelebrationsPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/vlogs" element={<VlogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/room" element={<RoomPage />} />
        </Routes>
      </main>
    </div>
  );
}
