import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import QuizModal from '../components/QuizModal.jsx';
import api, { API_BASE_URL } from '../api.js';

function resolveVideo(url) {
  if (!url) return '';
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
}

export default function VideoLesson() {
  const { topicId, videoId } = useParams();
  const user = JSON.parse(localStorage.getItem('skillcheck_user') || 'null');
  const isEmployee = user?.role === 'EMPLOYEE';
  const videoRef = useRef(null);
  const furthestWatchedRef = useRef(0);
  const lastAllowedTimeRef = useRef(0);
  const isRestoringSeekRef = useRef(false);
  const [video, setVideo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answeredIds, setAnsweredIds] = useState(new Set());
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);
  const [playbackMessage, setPlaybackMessage] = useState('');
  const [quizError, setQuizError] = useState('');

  useEffect(() => {
    furthestWatchedRef.current = 0;
    lastAllowedTimeRef.current = 0;
    setPlaybackMessage('');
    api.get(`/videos/${videoId}`).then((response) => {
      setVideo(response.data.video);
      setQuestions(response.data.questions);
    });
    api.get(`/progress/topic/${topicId}`).then((response) => {
      setAnsweredIds(new Set(response.data.answers.map((answer) => answer.questionId)));
      const currentProgress = response.data.progress.find((item) => item.videoId === videoId);
      const savedSecond = Math.floor(Number(currentProgress?.watchedSeconds) || 0);
      furthestWatchedRef.current = savedSecond;
      lastAllowedTimeRef.current = savedSecond;
    });
  }, [topicId, videoId]);

  function restoreAllowedTime(message) {
    const player = videoRef.current;
    if (!player) return;

    isRestoringSeekRef.current = true;
    player.currentTime = lastAllowedTimeRef.current;
    setPlaybackMessage(message);
    window.setTimeout(() => {
      isRestoringSeekRef.current = false;
    }, 150);
  }

  function hasUnansweredQuestionBetween(fromTime, toTime) {
    const start = Math.min(fromTime, toTime);
    const end = Math.max(fromTime, toTime);
    return questions.some((question) => {
      const timestamp = Number(question.timestamp);
      return !answeredIds.has(question.id) && timestamp > start + 0.25 && timestamp <= end + 0.25;
    });
  }

  function handleSeeking() {
    if (!isEmployee) return;

    const player = videoRef.current;
    if (!player || isRestoringSeekRef.current) return;

    const targetTime = player.currentTime;
    const previousAllowedTime = lastAllowedTimeRef.current;
    const seekTolerance = 1.25;
    const attemptedForwardSeek = targetTime > previousAllowedTime + seekTolerance;
    const beyondWatchedTime = targetTime > furthestWatchedRef.current + seekTolerance;
    const skippedRequiredQuestion = attemptedForwardSeek && hasUnansweredQuestionBetween(previousAllowedTime, targetTime);

    if (beyondWatchedTime || skippedRequiredQuestion) {
      restoreAllowedTime('Please watch the video and answer the required question before continuing.');
      return;
    }

    lastAllowedTimeRef.current = targetTime;
    setPlaybackMessage('');
  }

  function handleTimeUpdate() {
    const player = videoRef.current;
    if (!player || activeQuestion || isRestoringSeekRef.current) return;

    const currentTime = player.currentTime;
    const seekTolerance = 1.25;
    if (isEmployee && currentTime > furthestWatchedRef.current + seekTolerance) {
      restoreAllowedTime('Fast forward is disabled for training integrity. Please continue from your last watched time.');
      return;
    }

    const dueQuestion = questions.find((question) => {
      return !answeredIds.has(question.id) && currentTime >= Number(question.timestamp);
    });

    if (dueQuestion) {
      player.pause();
      const questionTime = Number(dueQuestion.timestamp);
      isRestoringSeekRef.current = true;
      player.currentTime = questionTime;
      furthestWatchedRef.current = Math.max(furthestWatchedRef.current, questionTime);
      lastAllowedTimeRef.current = questionTime;
      setActiveQuestion(dueQuestion);
      setSelected('');
      setResult(null);
      setQuizError('');
      setPlaybackMessage('');
      window.setTimeout(() => {
        isRestoringSeekRef.current = false;
      }, 150);
      return;
    }

    furthestWatchedRef.current = Math.max(furthestWatchedRef.current, currentTime);
    lastAllowedTimeRef.current = currentTime;
    setPlaybackMessage('');

    api.post('/progress/video', {
      topicId,
      videoId,
      watchedSeconds: Math.floor(currentTime),
      completed: false
    }).catch(() => {});
  }

  async function handleSubmitAnswer() {
    if (result) {
      setAnsweredIds((prev) => new Set([...prev, activeQuestion.id]));
      setActiveQuestion(null);
      setSelected('');
      setResult(null);
      setQuizError('');
      setTimeout(() => videoRef.current?.play(), 250);
      return;
    }

    try {
      const response = await api.post('/progress/answer', {
        questionId: activeQuestion.id,
        selectedAnswer: selected
      });
      setResult(response.data.answer);
      setQuizError('');
    } catch (error) {
      setQuizError(error.response?.data?.message || 'Unable to save your answer. Please try again.');
    }
  }

  async function handleEnded() {
    const player = videoRef.current;
    if (!player) return;

    const duration = Math.floor(player.duration || 0);
    const reachedEndNormally = duration > 0 && furthestWatchedRef.current >= duration - 1.25;
    if (isEmployee && !reachedEndNormally) {
      restoreAllowedTime('Please watch the video before completing this lesson.');
      return;
    }

    await api.post('/progress/video', {
      topicId,
      videoId,
      watchedSeconds: duration,
      completed: true
    });
  }

  if (!video) {
    return <><Navbar /><main className="page-shell"><p>Loading video...</p></main></>;
  }

  return (
    <>
      <Navbar />
      <main className="page-shell video-page">
        <Link to={`/topics/${topicId}`} className="back-link">← Back to topic</Link>
        <section className="content-card">
          <div className="video-header">
            <div>
              <span className="eyebrow">Interactive Video</span>
              <h2>{video.title}</h2>
              <p>{video.description}</p>
            </div>
            <span className="status-pill">{questions.length} checkpoint questions</span>
          </div>

          <video
            className="training-video"
            ref={videoRef}
            controls
            src={resolveVideo(video.videoUrl)}
            onSeeking={handleSeeking}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
          {isEmployee && <p className="training-integrity-note">Fast forward is disabled for training integrity. You may rewind and rewatch anytime.</p>}
          {playbackMessage && <div className="video-warning">{playbackMessage}</div>}

          <div className="question-timeline">
            <h3>Question Timeline</h3>
            {questions.length === 0 ? <p>No questions for this video.</p> : questions.map((question) => (
              <div key={question.id} className="timeline-item">
                <strong>{Math.floor(question.timestamp / 60)}:{String(question.timestamp % 60).padStart(2, '0')}</strong>
                <span>{question.questionText}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      {activeQuestion && (
        <QuizModal
          question={activeQuestion}
          selected={selected}
          setSelected={setSelected}
          result={result}
          error={quizError}
          onSubmit={handleSubmitAnswer}
        />
      )}
    </>
  );
}
