import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { logout, user } = useAuth();

  return (
    <nav className="sidebar">
      <span className="wordmark">PayFlow</span>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/send" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Send money
        </NavLink>
        <NavLink to="/activity" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Activity
        </NavLink>
        <NavLink to="/onboarding" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Bank account
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
