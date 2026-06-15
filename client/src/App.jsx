import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TopicDetail from './pages/TopicDetail.jsx';
import VideoLesson from './pages/VideoLesson.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminReports from './pages/AdminReports.jsx';
import DataMonitoring from './pages/DataMonitoring.jsx';
import DataMonitoringTablePage from './pages/dataMonitoring/DataMonitoringTablePage.jsx';
import Results from './pages/Results.jsx';

function getUser() {
  const raw = localStorage.getItem('skillcheck_user');
  return raw ? JSON.parse(raw) : null;
}

function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem('skillcheck_token');
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const user = getUser();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topics/:topicId"
        element={
          <ProtectedRoute>
            <TopicDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topics/:topicId/videos/:videoId"
        element={
          <ProtectedRoute>
            <VideoLesson />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <Results />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-monitoring"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DataMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-monitoring/employees"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DataMonitoringTablePage type="employees" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-monitoring/campaigns"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DataMonitoringTablePage type="campaigns" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-monitoring/videos"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DataMonitoringTablePage type="videos" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-monitoring/questions"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DataMonitoringTablePage type="questions" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-monitoring/progress"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DataMonitoringTablePage type="progress" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-monitoring/answers"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DataMonitoringTablePage type="answers" />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
