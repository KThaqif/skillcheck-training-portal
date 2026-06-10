import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import api from '../api.js';

export default function Results() {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    api.get('/topics').then((response) => setTopics(response.data.topics));
  }, []);

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="content-card">
          <h2>My Safety Results</h2>
          <p className="section-copy">Review your safety campaign completion, checkpoint answers, and safety understanding score.</p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Safety Campaign</th>
                <th>Progress</th>
                <th>Safety Checks Answered</th>
                <th>Safety Score</th>
                <th>Campaign Deadline</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.id}>
                  <td>{topic.title}</td>
                  <td>{topic.progress?.progressPercent || 0}%</td>
                  <td>{topic.progress?.answeredQuestions || 0}/{topic.progress?.totalQuestions || 0}</td>
                  <td>{topic.progress?.score || 0}%</td>
                  <td>{topic.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
