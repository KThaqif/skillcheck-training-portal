import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import api from '../api.js';
import DataMonitoringNav from './dataMonitoring/DataMonitoringNav.jsx';

export default function DataMonitoring() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/data-monitoring/summary')
      .then((response) => setSummary(response.data.summary))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load SHE data monitoring summary.'));
  }, []);

  const summaryCards = [
    ['Total Employees', summary?.totalEmployees ?? 0],
    ['Total SHE Admins', summary?.totalAdmins ?? 0],
    ['Total Safety Campaigns', summary?.totalCampaigns ?? 0],
    ['Total Safety Videos', summary?.totalVideos ?? 0],
    ['Total Checkpoint Questions', summary?.totalQuestions ?? 0],
    ['Total Employee Answers', summary?.totalEmployeeAnswers ?? 0],
    ['Total Completed Training Records', summary?.totalCompletedTrainingRecords ?? 0],
    ['Average Safety Score', `${summary?.averageSafetyScore ?? 0}%`]
  ];

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">SHE Data Monitoring</span>
            <h2>SHE Data Monitoring Overview</h2>
            <p>This page allows SHE Admins to monitor employee safety awareness data, campaign completion, checkpoint answers, and training progress without accessing the raw database directly.</p>
          </div>
        </section>

        <DataMonitoringNav />

        <section className="info-panel">
          <strong>Security note</strong>
          <p>Sensitive data such as passwords, tokens, and system secrets are hidden for security.</p>
        </section>

        {error && <div className="error-box">{error}</div>}

        <section className="stats-grid data-monitoring-summary">
          {summaryCards.map(([label, value]) => (
            <div className="stat-card" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
