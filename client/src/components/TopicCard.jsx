import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api.js';

function resolveImage(url) {
  if (!url) return 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1000&q=80';
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
}

export default function TopicCard({ topic }) {
  const progress = topic.progress?.progressPercent || 0;

  return (
    <article className="topic-card">
      <img src={resolveImage(topic.thumbnailUrl)} alt={topic.title} />
      <div className="topic-body">
        <span className="category-chip">{topic.category}</span>
        <h3>{topic.title}</h3>
        <p>{topic.description}</p>
        <div className="topic-meta">
          <span>{topic.videoCount || topic.progress?.totalVideos || 0} safety video(s)</span>
          <span>Campaign deadline: {topic.deadline}</span>
        </div>
        <div className="progress-line">
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="card-footer">
          <small>{progress}% complete</small>
          <Link className="outline-button course-button" to={`/topics/${topic.id}`}>View Safety Module</Link>
        </div>
      </div>
    </article>
  );
}
