import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api.js';
import DataMonitoringNav from './DataMonitoringNav.jsx';

const tableConfigs = {
  employees: {
    title: 'Employee Records',
    description: 'Monitor employee and SHE Admin account records without exposing passwords, tokens, or secrets.',
    endpoint: '/admin/data-monitoring/users',
    filters: ['search', 'department'],
    columns: [
      ['name', 'Name'],
      ['email', 'Email'],
      ['employeeId', 'Employee ID'],
      ['department', 'Department'],
      ['role', 'Role'],
      ['createdAt', 'Created At']
    ]
  },
  campaigns: {
    title: 'Safety Campaign Records',
    description: 'Review safety campaign status, category, deadlines, and creation dates.',
    endpoint: '/admin/data-monitoring/campaigns',
    filters: ['campaign', 'campaignStatus'],
    columns: [
      ['title', 'Campaign Title'],
      ['category', 'Safety Category'],
      ['status', 'Status'],
      ['deadline', 'Deadline'],
      ['createdAt', 'Created At']
    ]
  },
  videos: {
    title: 'Safety Video Records',
    description: 'Review safety video modules and storage status without exposing full video URLs.',
    endpoint: '/admin/data-monitoring/videos',
    filters: ['campaign'],
    columns: [
      ['videoTitle', 'Video Title'],
      ['campaignTitle', 'Campaign Title'],
      ['moduleOrder', 'Module Order / Lesson Sequence'],
      ['videoUrlStatus', 'Video URL Status'],
      ['createdAt', 'Created At']
    ]
  },
  questions: {
    title: 'Checkpoint Question Records',
    description: 'Review video checkpoint questions, pause times, option counts, and correct option text.',
    endpoint: '/admin/data-monitoring/questions',
    filters: ['campaign'],
    columns: [
      ['videoTitle', 'Video Title'],
      ['questionText', 'Question Text'],
      ['checkpointTime', 'Checkpoint Time'],
      ['optionCount', 'Number of Options'],
      ['correctOptionText', 'Correct Option Text']
    ]
  },
  progress: {
    title: 'Employee Progress Records',
    description: 'Monitor employee training progress, completion status, watched percentage, and score.',
    endpoint: '/admin/data-monitoring/progress',
    filters: ['search', 'department', 'campaign', 'completionStatus'],
    columns: [
      ['employeeName', 'Employee Name'],
      ['employeeId', 'Employee ID'],
      ['department', 'Department'],
      ['campaignTitle', 'Campaign Title'],
      ['videoTitle', 'Video Title'],
      ['watchedPercentage', 'Watched Percentage'],
      ['completed', 'Completed Status'],
      ['score', 'Score'],
      ['updatedAt', 'Last Updated']
    ]
  },
  answers: {
    title: 'Employee Answer Records',
    description: 'Review employee checkpoint answers and correct/wrong results.',
    endpoint: '/admin/data-monitoring/answers',
    filters: ['search', 'department', 'campaign', 'answerStatus'],
    columns: [
      ['employeeName', 'Employee Name'],
      ['campaignTitle', 'Campaign Title'],
      ['videoTitle', 'Video Title'],
      ['questionText', 'Question Text'],
      ['selectedAnswer', 'Selected Answer'],
      ['isCorrect', 'Correct / Wrong'],
      ['answeredAt', 'Answered At']
    ]
  }
};

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '-';
  if (key === 'checkpointTime') {
    const totalSeconds = Number(value) || 0;
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }
  if (key === 'watchedPercentage') return `${value}%`;
  if (key === 'completed') return value ? 'Completed' : 'Incomplete';
  if (key === 'isCorrect') return value ? 'Correct' : 'Wrong';
  if (key === 'score') return `${value}%`;
  if (key.toLowerCase().includes('at')) return String(value).replace('T', ' ').slice(0, 19);
  return String(value);
}

const emptyFilters = {
  search: '',
  department: '',
  campaignId: '',
  status: '',
  answerStatus: ''
};

export default function DataMonitoringTablePage({ type }) {
  const config = tableConfigs[type];
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hasFilter = (name) => config.filters.includes(name);

  const queryParams = useMemo(() => {
    const params = { page: pagination.page, limit: pagination.limit };
    if (hasFilter('search') && appliedFilters.search) params.search = appliedFilters.search;
    if (hasFilter('department') && appliedFilters.department) params.department = appliedFilters.department;
    if (hasFilter('campaign') && appliedFilters.campaignId) params.campaignId = appliedFilters.campaignId;
    if (hasFilter('campaignStatus') && appliedFilters.status) params.status = appliedFilters.status;
    if (hasFilter('completionStatus') && appliedFilters.status) params.status = appliedFilters.status;
    if (hasFilter('answerStatus') && appliedFilters.answerStatus) params.answerStatus = appliedFilters.answerStatus;
    return params;
  }, [appliedFilters, config.filters, pagination.limit, pagination.page]);

  useEffect(() => {
    if (hasFilter('campaign')) {
      api.get('/admin/data-monitoring/campaigns', { params: { page: 1, limit: 100 } })
        .then((response) => setCampaigns(response.data.records))
        .catch(() => setCampaigns([]));
    }
  }, [type]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(config.endpoint, { params: queryParams })
      .then((response) => {
        setRecords(response.data.records);
        setPagination(response.data.pagination);
      })
      .catch((err) => setError(err.response?.data?.message || `Unable to load ${config.title.toLowerCase()}.`))
      .finally(() => setLoading(false));
  }, [config.endpoint, config.title, queryParams]);

  function applyFilters(event) {
    event.preventDefault();
    setPagination((current) => ({ ...current, page: 1 }));
    setAppliedFilters({
      search: filters.search.trim(),
      department: filters.department.trim(),
      campaignId: filters.campaignId,
      status: filters.status,
      answerStatus: filters.answerStatus
    });
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function setPage(page) {
    setPagination((current) => ({ ...current, page }));
  }

  const canGoBack = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">SHE Data Monitoring</span>
            <h2>{config.title}</h2>
            <p>{config.description}</p>
          </div>
        </section>

        <DataMonitoringNav />

        <section className="info-panel">
          <strong>Security note</strong>
          <p>Sensitive data such as passwords, tokens, and system secrets are hidden for security.</p>
        </section>

        {config.filters.length > 0 && (
          <section className="content-card">
            <div className="section-title-row compact-row">
              <h2>Filters</h2>
              <span>Default 25 records</span>
            </div>
            <form className="report-filters data-monitoring-filters" onSubmit={applyFilters}>
              {hasFilter('search') && (
                <label>Employee Search
                  <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Name, email, or employee ID" />
                </label>
              )}
              {hasFilter('department') && (
                <label>Department
                  <input value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })} placeholder="Department or SHE area" />
                </label>
              )}
              {hasFilter('campaign') && (
                <label>Campaign
                  <select value={filters.campaignId} onChange={(event) => setFilters({ ...filters, campaignId: event.target.value })}>
                    <option value="">All campaigns</option>
                    {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}
                  </select>
                </label>
              )}
              {hasFilter('campaignStatus') && (
                <label>Campaign Status
                  <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                    <option value="">All statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="LAUNCHED">Launched</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </label>
              )}
              {hasFilter('completionStatus') && (
                <label>Completion Status
                  <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                    <option value="">All statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="INCOMPLETE">Incomplete</option>
                  </select>
                </label>
              )}
              {hasFilter('answerStatus') && (
                <label>Answer Result
                  <select value={filters.answerStatus} onChange={(event) => setFilters({ ...filters, answerStatus: event.target.value })}>
                    <option value="">All answers</option>
                    <option value="CORRECT">Correct</option>
                    <option value="WRONG">Wrong</option>
                  </select>
                </label>
              )}
              <div className="edit-actions">
                <button className="primary-button">Apply Filters</button>
                <button className="outline-button" type="button" onClick={resetFilters}>Reset</button>
              </div>
            </form>
          </section>
        )}

        <section className="content-card">
          <div className="section-title-row compact-row">
            <h2>{config.title}</h2>
            <span>{pagination.total} record(s)</span>
          </div>

          {error && <div className="error-box">{error}</div>}

          {loading ? <p>Loading {config.title.toLowerCase()}...</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  {config.columns.map(([, label]) => <th key={label}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length}>No records found.</td>
                  </tr>
                ) : records.map((record) => (
                  <tr key={record.id}>
                    {config.columns.map(([key]) => <td key={key}>{formatValue(key, record[key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="pagination-row">
            <button className="outline-button" type="button" disabled={!canGoBack || loading} onClick={() => setPage(pagination.page - 1)}>Previous</button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button className="outline-button" type="button" disabled={!canGoNext || loading} onClick={() => setPage(pagination.page + 1)}>Next</button>
          </div>
        </section>
      </main>
    </>
  );
}
