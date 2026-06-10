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
  const totalQuestions = topics.reduce((total, topic) => total + Number(topic.progress?.totalQuestions || 0), 0);
  const answeredQuestions = topics.reduce((total, topic) => total + Number(topic.progress?.answeredQuestions || 0), 0);
  const averageScore = topics.length === 0
    ? 0
    : Math.round(topics.reduce((total, topic) => total + Number(topic.progress?.score || 0), 0) / topics.length);

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="hero-panel dashboard-hero">
          <div>
            <span className="eyebrow">Safety Dashboard</span>
            <h2>Welcome back, {user?.name}.</h2>
            <p>Welcome to the Perodua SHE Safety Awareness Training Portal. Complete your assigned safety campaigns, watch awareness videos, and answer checkpoint questions to strengthen workplace safety understanding.</p>
          </div>
          <div className="stats-grid compact">
            <div className="stat-card"><strong>{topics.length}</strong><span>Assigned Safety Campaigns</span></div>
            <div className="stat-card"><strong>{inProgress}</strong><span>In Progress Safety Modules</span></div>
            <div className="stat-card"><strong>{completed}</strong><span>Completed Safety Modules</span></div>
          </div>
        </section>

        <section className="info-panel">
          <strong>Why checkpoint questions are required</strong>
          <p>Perodua SHE uses short safety understanding checks to confirm employees understand hazards, controls, and accident prevention actions before continuing each module.</p>
          <span>{answeredQuestions}/{totalQuestions} safety understanding checks answered - Average safety score {averageScore}%</span>
        </section>

        <section className="section-title-row">
          <h2>Latest SHE Safety Campaigns</h2>
          <span>{topics.length} campaign(s)</span>
        </section>

        {loading ? <p>Loading safety campaigns...</p> : (
          <div className="topic-grid">
            {topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
          </div>
        )}
      </main>
    </>
  );
}
