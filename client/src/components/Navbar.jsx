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
        <img className="brand-icon brand-logo" src="/perodua.jpg" alt="Perodua" />
        <div>
          <h1>SHE Perodua</h1>
          <span>Perodua SHE Safety Awareness Training Portal</span>
        </div>
      </Link>

      <nav className="nav-links">
        {user?.role === 'ADMIN' ? <NavLink to="/admin" end>SHE Admin Dashboard</NavLink> : <NavLink to="/dashboard">Safety Dashboard</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/admin/reports">SHE Reports</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/admin/data-monitoring">SHE Data Monitoring</NavLink>}
        {user?.role !== 'ADMIN' && <NavLink to="/results">Safety Results</NavLink>}
      </nav>

      <div className="nav-actions">
        <button className="notification-button">🔔<span>3</span></button>
        <div className="profile-badge">{user?.name?.[0] || 'U'}</div>
        <button className="text-button" onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
