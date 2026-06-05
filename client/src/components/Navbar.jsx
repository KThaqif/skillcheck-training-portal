import { Link, NavLink, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('skillcheck_user') || 'null');

  function logout() {
    localStorage.removeItem('skillcheck_token');
    localStorage.removeItem('skillcheck_user');
    navigate('/login');
  }

  return (
    <header className="navbar">
      <Link to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} className="brand">
        <div className="brand-icon">✓</div>
        <div>
          <h1>SKILLCHECK</h1>
          <span>Interactive Employee Training Portal</span>
        </div>
      </Link>

      <nav className="nav-links">
        {user?.role === 'ADMIN' ? <NavLink to="/admin" end>Dashboard</NavLink> : <NavLink to="/dashboard">Dashboard</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/admin/reports">Reports</NavLink>}
        {user?.role !== 'ADMIN' && <NavLink to="/results">My Results</NavLink>}
      </nav>

      <div className="nav-actions">
        <button className="notification-button">🔔<span>3</span></button>
        <div className="profile-badge">{user?.name?.[0] || 'U'}</div>
        <button className="text-button" onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
