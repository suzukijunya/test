import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import CalendarPage from './pages/CalendarPage';
import TodosPage from './pages/TodosPage';
import AnniversariesPage from './pages/AnniversariesPage';
import CelebrationsPage from './pages/CelebrationsPage';
import VlogsPage from './pages/VlogsPage';
import SettingsPage from './pages/SettingsPage';
import { useStore } from './store';

const NAV = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/calendar', label: 'カレンダー', short: '予定', icon: '📅' },
  { to: '/todos', label: 'やりたい', icon: '📝' },
  { to: '/anniversaries', label: '記念日', icon: '🎂' },
  { to: '/celebrations', label: 'お祝い準備', short: '準備', icon: '🎁' },
  { to: '/vlogs', label: 'Vlog', icon: '🎬' },
  { to: '/settings', label: '設定', icon: '⚙️' },
];

const SYNC_LABEL = { local: 'この端末に保存', connecting: '接続中…', cloud: 'ふたりで共有中' } as const;

export default function App() {
  const { mode, syncError } = useStore();
  return (
    <div className="layout">
      <header className="topbar">
        <span className="brand">💑 ふたりノート</span>
        <span className={`sync sync-${mode}`}>{SYNC_LABEL[mode]}</span>
      </header>
      <nav className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
            <span className="nav-short">{'short' in n ? n.short : n.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="main">
        {syncError && <div className="notice error">{syncError}</div>}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/anniversaries" element={<AnniversariesPage />} />
          <Route path="/celebrations" element={<CelebrationsPage />} />
          <Route path="/celebrations/:id" element={<CelebrationsPage />} />
          <Route path="/vlogs" element={<VlogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
