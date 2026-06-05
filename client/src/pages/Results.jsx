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
          <h2>My Training Results</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Progress</th>
                <th>Questions Answered</th>
                <th>Score</th>
                <th>Deadline</th>
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
