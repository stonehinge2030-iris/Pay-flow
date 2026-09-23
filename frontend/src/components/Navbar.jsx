import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HomeIcon, SendIcon, ListIcon, BankIcon } from './Icons';

export default function Navbar() {
  const { logout, user } = useAuth();

  return (
    <nav className="sidebar">
      <span className="wordmark">PayFlow</span>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <HomeIcon width={16} height={16} /> Home
        </NavLink>
        <NavLink to="/send" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <SendIcon width={16} height={16} /> Send money
        </NavLink>
        <NavLink to="/activity" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ListIcon width={16} height={16} /> Activity
        </NavLink>
        <NavLink to="/onboarding" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BankIcon width={16} height={16} /> Bank account
        </NavLink>
      </div>
      {user && (
        <button className="sign-out" onClick={logout}>
          Sign out ({user.name})
        </button>
      )}
    </nav>
  );
}
