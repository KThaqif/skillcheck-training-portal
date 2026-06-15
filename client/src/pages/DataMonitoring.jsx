import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import api from '../api.js';

const tableConfigs = [
  {
    key: 'users',
    title: 'Employee Records',
    endpoint: '/admin/data-monitoring/users',
    columns: [
      ['name', 'Name'],
      ['email', 'Email'],
      ['employeeId', 'Employee ID'],
      ['department', 'Department'],
      ['role', 'Role'],
      ['createdAt', 'Created At']
    ]
  },
  {
    key: 'campaigns',
    title: 'Safety Campaign Records',
    endpoint: '/admin/data-monitoring/campaigns',
    columns: [
      ['title', 'Campaign Title'],
      ['category', 'Safety Category'],
      ['status', 'Status'],
      ['deadline', 'Deadline'],
      ['createdAt', 'Created At']
    ]
  },
  {
    key: 'videos',
    title: 'Safety Video Records',
    endpoint: '/admin/data-monitoring/videos',
    columns: [
      ['videoTitle', 'Video Title'],
      ['campaignTitle', 'Campaign Title'],
      ['moduleOrder', 'Module Order'],
      ['videoUrlStatus', 'Video URL Status']
    ]
  },
  {
    key: 'questions',
    title: 'Checkpoint Question Records',
    endpoint: '/admin/data-monitoring/questions',
    columns: [
      ['videoTitle', 'Video Title'],
      ['questionText', 'Question Text'],
      ['checkpointTime', 'Checkpoint Time'],
      ['optionCount', 'Number of Options'],
      ['correctOptionText', 'Correct Option Text']
    ]
  },
  {
    key: 'progress',
    title: 'Employee Progress Records',
    endpoint: '/admin/data-monitoring/progress',
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
  {
    key: 'answers',
    title: 'Employee Answer Records',
    endpoint: '/admin/data-monitoring/answers',
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
];

const initialTableState = tableConfigs.reduce((state, table) => ({
  ...state,
  [table.key]: {
    records: [],
    pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
    loading: true,
    error: ''
  }
}), {});

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

export default function DataMonitoring() {
  const [summary, setSummary] = useState(null);
  const [tables, setTables] = useState(initialTableState);
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    campaignId: '',
    status: '',
    answerStatus: ''
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const campaigns = useMemo(() => tables.campaigns.records, [tables.campaigns.records]);
  const departments = useMemo(() => {
    const departmentSet = new Set(tables.users.records.map((user) => user.department).filter(Boolean));
    return Array.from(departmentSet).sort();
  }, [tables.users.records]);

  function buildParams(tableKey, pageOverride) {
    const current = tables[tableKey].pagination;
    const params = {
      page: pageOverride || current.page,
      limit: current.limit
    };

    if (['users', 'progress', 'answers'].includes(tableKey)) {
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.department) params.department = appliedFilters.department;
    }

    if (['campaigns', 'videos', 'questions', 'progress', 'answers'].includes(tableKey) && appliedFilters.campaignId) {
      params.campaignId = appliedFilters.campaignId;
    }

    if (tableKey === 'campaigns' && appliedFilters.status) params.status = appliedFilters.status;
    if (tableKey === 'progress' && appliedFilters.status) params.status = appliedFilters.status;
    if (tableKey === 'answers' && appliedFilters.answerStatus) params.answerStatus = appliedFilters.answerStatus;

    return params;
  }

  async function loadTable(table, pageOverride) {
    setTables((current) => ({
      ...current,
      [table.key]: { ...current[table.key], loading: true, error: '' }
    }));

    try {
      const response = await api.get(table.endpoint, { params: buildParams(table.key, pageOverride) });
      setTables((current) => ({
        ...current,
        [table.key]: {
          records: response.data.records,
          pagination: response.data.pagination,
          loading: false,
          error: ''
        }
      }));
    } catch (error) {
      setTables((current) => ({
        ...current,
        [table.key]: {
          ...current[table.key],
          loading: false,
          error: error.response?.data?.message || `Unable to load ${table.title.toLowerCase()}.`
        }
      }));
    }
  }

  function loadAllTables(pageOverride = 1) {
    tableConfigs.forEach((table) => loadTable(table, pageOverride));
  }

  useEffect(() => {
    api.get('/admin/data-monitoring/summary')
      .then((response) => setSummary(response.data.summary))
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    loadAllTables(1);
  }, [appliedFilters]);

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters({
      search: filters.search.trim(),
      department: filters.department,
      campaignId: filters.campaignId,
      status: filters.status,
      answerStatus: filters.answerStatus
    });
  }

  function resetFilters() {
    const emptyFilters = { search: '', department: '', campaignId: '', status: '', answerStatus: '' };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

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
            <h2>SHE Data Monitoring</h2>
            <p>This page allows SHE Admins to monitor employee safety awareness data, campaign completion, checkpoint answers, and training progress without accessing the raw database directly.</p>
          </div>
        </section>

        <section className="info-panel">
          <strong>Security note</strong>
          <p>Sensitive data such as passwords, tokens, and system secrets are hidden for security.</p>
        </section>

        <section className="stats-grid data-monitoring-summary">
          {summaryCards.map(([label, value]) => (
            <div className="stat-card" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className="content-card">
          <div className="section-title-row compact-row">
            <h2>Monitoring Filters</h2>
            <span>Default 25 records per table</span>
          </div>
          <form className="report-filters data-monitoring-filters" onSubmit={applyFilters}>
            <label>Employee Search
              <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Name, email, or employee ID" />
            </label>
            <label>Department
              <select value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })}>
                <option value="">All departments</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
            <label>Campaign
              <select value={filters.campaignId} onChange={(event) => setFilters({ ...filters, campaignId: event.target.value })}>
                <option value="">All campaigns</option>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}
              </select>
            </label>
            <label>Completion / Campaign Status
              <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="">All statuses</option>
                <option value="COMPLETED">Completed progress</option>
                <option value="INCOMPLETE">Incomplete progress</option>
                <option value="DRAFT">Draft campaigns</option>
                <option value="LAUNCHED">Launched campaigns</option>
                <option value="ARCHIVED">Archived campaigns</option>
              </select>
            </label>
            <label>Answer Result
              <select value={filters.answerStatus} onChange={(event) => setFilters({ ...filters, answerStatus: event.target.value })}>
                <option value="">All answers</option>
                <option value="CORRECT">Correct</option>
                <option value="WRONG">Wrong</option>
              </select>
            </label>
            <div className="edit-actions">
              <button className="primary-button">Apply Filters</button>
              <button className="outline-button" type="button" onClick={resetFilters}>Reset</button>
            </div>
          </form>
        </section>

        {tableConfigs.map((table) => {
          const state = tables[table.key];
          const canGoBack = state.pagination.page > 1;
          const canGoNext = state.pagination.page < state.pagination.totalPages;

          return (
            <section className="content-card" key={table.key}>
              <div className="section-title-row compact-row">
                <h2>{table.title}</h2>
                <span>{state.pagination.total} record(s)</span>
              </div>

              {state.error && <div className="error-box">{state.error}</div>}

              {state.loading ? <p>Loading {table.title.toLowerCase()}...</p> : (
                <table className="data-table">
                  <thead>
                    <tr>
                      {table.columns.map(([, label]) => <th key={label}>{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {state.records.length === 0 ? (
                      <tr>
                        <td colSpan={table.columns.length}>No records found.</td>
                      </tr>
                    ) : state.records.map((record) => (
                      <tr key={record.id}>
                        {table.columns.map(([key]) => <td key={key}>{formatValue(key, record[key])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="pagination-row">
                <button className="outline-button" type="button" disabled={!canGoBack || state.loading} onClick={() => loadTable(table, state.pagination.page - 1)}>Previous</button>
                <span>Page {state.pagination.page} of {state.pagination.totalPages}</span>
                <button className="outline-button" type="button" disabled={!canGoNext || state.loading} onClick={() => loadTable(table, state.pagination.page + 1)}>Next</button>
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
