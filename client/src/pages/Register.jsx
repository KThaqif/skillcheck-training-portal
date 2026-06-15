import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api.js';
import { LIMITS, isValidEmail } from '../validation.js';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const cleanForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      employeeId: form.employeeId.trim(),
      department: form.department.trim(),
      password: form.password
    };

    if (!cleanForm.name) {
      setError('Name is required.');
      return;
    }
    if (!cleanForm.email || !isValidEmail(cleanForm.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!cleanForm.employeeId) {
      setError('Employee ID is required.');
      return;
    }
    if (!cleanForm.department) {
      setError('Department is required.');
      return;
    }
    if (cleanForm.password.length < LIMITS.passwordMin) {
      setError(`Password must be at least ${LIMITS.passwordMin} characters.`);
      return;
    }
    if (cleanForm.password.length > LIMITS.passwordMax) {
      setError(`Password must not exceed ${LIMITS.passwordMax} characters.`);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', cleanForm);
      localStorage.setItem('skillcheck_token', response.data.token);
      localStorage.setItem('skillcheck_user', JSON.stringify(response.data.user));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === 'ECONNABORTED') {
        setError(`Registration timed out. Check that the backend is running at ${API_BASE_URL}.`);
      } else if (err.request) {
        setError(`Cannot reach the backend at ${API_BASE_URL}. Start the backend and check the API base URL.`);
      } else {
        setError(`Registration failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-visual">
          <img className="brand-icon brand-logo login-logo" src="/perodua.jpg" alt="Perodua" />
          <h1>SHE Perodua</h1>
          <p>Create an employee account to access Perodua SHE safety campaigns, awareness videos, and checkpoint questions.</p>
          <div className="demo-accounts">
            <strong>Already registered?</strong>
            <span>Use your company email and password to continue safety awareness training.</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <span className="eyebrow">Employee Safety Registration</span>
          <h2>Create your safety account</h2>
          <label>
            Full Name
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Your full name" required maxLength={LIMITS.name} />
          </label>
          <label>
            Email
            <input value={form.email} onChange={(event) => updateField('email', event.target.value)} type="email" placeholder="you@company.com" required maxLength={LIMITS.email} />
          </label>
          <label>
            Employee ID
            <input value={form.employeeId} onChange={(event) => updateField('employeeId', event.target.value)} placeholder="EMP002" required maxLength={LIMITS.employeeId} />
          </label>
          <label>
            Department
            <input value={form.department} onChange={(event) => updateField('department', event.target.value)} placeholder="Department or section" required maxLength={LIMITS.department} />
          </label>
          <label>
            Password
            <input value={form.password} onChange={(event) => updateField('password', event.target.value)} type="password" placeholder="At least 6 characters" required minLength={LIMITS.passwordMin} maxLength={LIMITS.passwordMax} />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-button" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
          <Link className="register-link" to="/login">Back to login</Link>
        </form>
      </section>
    </main>
  );
}
