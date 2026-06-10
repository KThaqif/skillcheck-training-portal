import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api.js';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('employee@company.com');
  const [password, setPassword] = useState('employee123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sessionMessage = sessionStorage.getItem('skillcheck_session_message');
    if (sessionMessage) {
      setError(sessionMessage);
      sessionStorage.removeItem('skillcheck_session_message');
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('skillcheck_token', response.data.token);
      localStorage.setItem('skillcheck_user', JSON.stringify(response.data.user));
      navigate(response.data.user.role === 'ADMIN' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === 'ECONNABORTED') {
        setError(`Login timed out. Check that the backend is running at ${API_BASE_URL}.`);
      } else if (err.request) {
        setError(`Cannot reach the backend at ${API_BASE_URL}. Start the backend and check the API base URL.`);
      } else {
        setError(`Login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-visual">
          <div className="brand-icon large">✓</div>
          <h1>Perodua SHE</h1>
          <p>Safety awareness training for workplace hazard awareness, safety compliance, and accident prevention.</p>
          <div className="demo-accounts">
            <strong>Demo accounts</strong>
            <span>Employee: employee@company.com / employee123</span>
            <span>SHE Admin: admin@company.com / admin123</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <span className="eyebrow">Perodua SHE Safety Awareness Training Portal</span>
          <h2>Login to your safety account</h2>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="employee@company.com" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-button" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
          <Link className="register-link" to="/register">Register employee account</Link>
        </form>
      </section>
    </main>
  );
}
