import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import api from '../api.js';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [topicFilter, setTopicFilter] = useState('ALL');

  useEffect(() => {
    api.get('/admin/reports')
      .then((response) => setReports(response.data.report))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load admin reports.'))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    return reports.flatMap((report) => report.topics.map((topic) => ({
      employee: report.employee,
      topic
    })));
  }, [reports]);

  const departments = useMemo(() => {
    return Array.from(new Set(reports.map((report) => report.employee.department).filter(Boolean))).sort();
  }, [reports]);

  const topics = useMemo(() => {
    const topicMap = new Map();
    for (const { topic } of rows) {
      topicMap.set(topic.topicId, topic.title);
    }
    return Array.from(topicMap.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(({ employee, topic }) => {
      const matchesDepartment = departmentFilter === 'ALL' || employee.department === departmentFilter;
      const matchesTopic = topicFilter === 'ALL' || topic.topicId === topicFilter;
      return matchesDepartment && matchesTopic;
    });
  }, [departmentFilter, rows, topicFilter]);

  const summary = useMemo(() => {
    const employeeCount = new Set(filteredRows.map(({ employee }) => employee.id)).size;
    const assignmentCount = filteredRows.length;
    const completedCount = filteredRows.filter(({ topic }) => topic.progressPercent === 100).length;
    const averageScore = filteredRows.length === 0
      ? 0
      : Math.round(filteredRows.reduce((total, { topic }) => total + Number(topic.score || 0), 0) / filteredRows.length);

    return { employeeCount, assignmentCount, completedCount, averageScore };
  }, [filteredRows]);

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">Admin Reports</span>
            <h2>Employee training progress and quiz performance.</h2>
            <p>Review assigned topics, completion status, question attempts, and scores across employees.</p>
          </div>
          <div className="stats-grid compact">
            <div className="stat-card"><strong>{summary.employeeCount}</strong><span>Employees</span></div>
            <div className="stat-card"><strong>{summary.completedCount}</strong><span>Completed</span></div>
            <div className="stat-card"><strong>{summary.averageScore}%</strong><span>Avg Score</span></div>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        <section className="content-card">
          <div className="section-title-row compact-row">
            <h2>Training Report</h2>
            <span>{summary.assignmentCount} assignment(s)</span>
          </div>

          <div className="report-filters">
            <label>Department
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                <option value="ALL">All departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>
            <label>Topic
              <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
                <option value="ALL">All topics</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.title}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? <p>Loading reports...</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Topic</th>
                  <th>Videos</th>
                  <th>Progress</th>
                  <th>Questions</th>
                  <th>Score</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="9">No report data yet.</td>
                  </tr>
                ) : filteredRows.map(({ employee, topic }) => (
                  <tr key={`${employee.id}-${topic.topicId}`}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.department}</td>
                    <td>{topic.title}</td>
                    <td>{topic.completedVideos}/{topic.totalVideos}</td>
                    <td>{topic.progressPercent}%</td>
                    <td>{topic.answeredQuestions}/{topic.totalQuestions}</td>
                    <td>{topic.score}%</td>
                    <td>{topic.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}
