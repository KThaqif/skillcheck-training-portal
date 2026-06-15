import { NavLink } from 'react-router-dom';

const tabs = [
  ['/admin/data-monitoring', 'Overview'],
  ['/admin/data-monitoring/employees', 'Employees'],
  ['/admin/data-monitoring/campaigns', 'Safety Campaigns'],
  ['/admin/data-monitoring/videos', 'Safety Videos'],
  ['/admin/data-monitoring/questions', 'Checkpoint Questions'],
  ['/admin/data-monitoring/progress', 'Employee Progress'],
  ['/admin/data-monitoring/answers', 'Employee Answers']
];

export default function DataMonitoringNav() {
  return (
    <nav className="data-monitoring-tabs">
      {tabs.map(([to, label]) => (
        <NavLink key={to} to={to} end={to === '/admin/data-monitoring'}>{label}</NavLink>
      ))}
    </nav>
  );
}
