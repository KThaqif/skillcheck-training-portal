import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import TopicCard from '../components/TopicCard.jsx';
import api from '../api.js';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('skillcheck_user') || 'null');
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/topics')
      .then((response) => setTopics(response.data.topics))
      .finally(() => setLoading(false));
  }, []);

  const completed = topics.filter((topic) => topic.progress?.progressPercent === 100).length;
  const inProgress = topics.filter((topic) => (topic.progress?.progressPercent || 0) > 0 && topic.progress?.progressPercent < 100).length;

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="hero-panel dashboard-hero">
          <div>
            <span className="eyebrow">Employee Dashboard</span>
            <h2>Welcome back, {user?.name}.</h2>
            <p>Continue your assigned training topics and answer checkpoint questions during each video.</p>
          </div>
          <div className="stats-grid compact">
            <div className="stat-card"><strong>{topics.length}</strong><span>Assigned</span></div>
            <div className="stat-card"><strong>{inProgress}</strong><span>In Progress</span></div>
            <div className="stat-card"><strong>{completed}</strong><span>Completed</span></div>
          </div>
        </section>

        <section className="section-title-row">
          <h2>Recently Launched Training Topics</h2>
          <span>{topics.length} topic(s)</span>
        </section>

        {loading ? <p>Loading topics...</p> : (
          <div className="topic-grid">
            {topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
          </div>
        )}
      </main>
    </>
  );
}
