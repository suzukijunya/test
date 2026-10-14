import { NavLink } from 'react-router-dom';

/** 記念日とお祝い準備の切り替え */
export default function AnnivTabs() {
  return (
    <nav className="tabs" aria-label="記念日とお祝い準備">
      <NavLink to="/anniversaries" className={({ isActive }) => (isActive ? 'active' : '')}>
        🎂 記念日
      </NavLink>
      <NavLink to="/celebrations" className={({ isActive }) => (isActive ? 'active' : '')}>
        🎁 お祝い準備
      </NavLink>
    </nav>
  );
}
