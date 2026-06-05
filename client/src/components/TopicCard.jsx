import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api.js';

function resolveImage(url) {
  if (!url) return 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80';
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
          <span>{topic.videoCount || topic.progress?.totalVideos || 0} videos</span>
          <span>Deadline: {topic.deadline}</span>
        </div>
        <div className="progress-line">
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="card-footer">
          <small>{progress}% completed</small>
          <Link className="outline-button course-button" to={`/topics/${topic.id}`}>View Course</Link>
        </div>
      </div>
    </article>
  );
}
