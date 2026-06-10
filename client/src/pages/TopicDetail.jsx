import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import api from '../api.js';

export default function TopicDetail() {
  const { topicId } = useParams();
  const [topic, setTopic] = useState(null);
  const [videos, setVideos] = useState([]);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    api.get(`/topics/${topicId}`).then((response) => {
      setTopic(response.data.topic);
      setVideos(response.data.videos);
    });
    api.get(`/progress/topic/${topicId}`).then((response) => setProgress(response.data.progress));
  }, [topicId]);

  function isVideoCompleted(videoId) {
    return progress.some((item) => item.videoId === videoId && item.completed);
  }

  if (!topic) {
    return <><Navbar /><main className="page-shell"><p>Loading safety campaign...</p></main></>;
  }

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="hero-panel topic-hero">
          <div>
            <span className="category-chip">{topic.category}</span>
            <h2>{topic.title}</h2>
            <p>{topic.description}</p>
            <div className="topic-meta big">
              <span>{videos.length} safety video(s)</span>
              <span>{topic.progress?.totalQuestions || 0} checkpoint question(s)</span>
              <span>Campaign deadline: {topic.deadline}</span>
            </div>
          </div>
          <div className="circle-progress"><strong>{topic.progress?.progressPercent || 0}%</strong><span>Safety Module Complete</span></div>
        </section>

        <section className="content-card">
          <h2>Safety Awareness Video Modules</h2>
          <p className="section-copy">Watch each safety video carefully. Checkpoint questions help confirm hazard awareness and safe work practices.</p>
          <div className="video-list">
            {videos.map((video, index) => (
              <Link className="video-row" to={`/topics/${topicId}/videos/${video.id}`} key={video.id}>
                <div className="video-number">{index + 1}</div>
                <div>
                  <h3>{video.title}</h3>
                  <p>{video.description || 'No safety module description.'}</p>
                </div>
                <span className={isVideoCompleted(video.id) ? 'status-pill complete' : 'status-pill'}>
                  {isVideoCompleted(video.id) ? 'Completed' : `${video.questionCount} safety checks`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
