import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import api, { API_BASE_URL } from '../api.js';

function resolveVideoUrl(url) {
  if (!url) return '';
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
}

function formatPauseTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const allowedVideoExtensions = ['mp4', 'webm', 'mov'];
const allowedVideoMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-quicktime', 'video/mov'];

export default function AdminDashboard() {
  const questionVideoRef = useRef(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [editingTopicId, setEditingTopicId] = useState('');
  const [editTopicForm, setEditTopicForm] = useState({
    title: '',
    category: '',
    description: '',
    thumbnailUrl: '',
    startDate: '',
    deadline: ''
  });
  const [topicForm, setTopicForm] = useState({
    title: '',
    category: 'Safety Training',
    description: '',
    thumbnailUrl: '',
    startDate: new Date().toISOString().slice(0, 10),
    deadline: '2026-06-30'
  });
  const [videoForm, setVideoForm] = useState({ title: '', description: '', order: 1, file: null });
  const [questionForm, setQuestionForm] = useState({
    pauseMinutes: '',
    pauseSeconds: '',
    questionText: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correctOption: ''
  });

  async function loadData() {
    const topicResponse = await api.get('/topics');
    setTopics(topicResponse.data.topics);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedTopicId) {
      setVideos([]);
      setSelectedVideoId('');
      return;
    }
    api.get(`/videos/topic/${selectedTopicId}`).then((response) => setVideos(response.data.videos));
  }, [selectedTopicId]);

  useEffect(() => {
    setQuestionForm((current) => ({ ...current, pauseMinutes: '', pauseSeconds: '' }));
  }, [selectedVideoId]);

  async function createTopic(event) {
    event.preventDefault();
    await api.post('/topics', topicForm);
    setMessageType('success');
    setMessage('Topic created as draft. Add videos and launch when ready.');
    setTopicForm({ ...topicForm, title: '', description: '', thumbnailUrl: '' });
    loadData();
  }

  async function launchTopic(topicId) {
    await api.patch(`/topics/${topicId}/launch`);
    setMessageType('success');
    setMessage('Topic launched successfully. Employees can now access it.');
    loadData();
  }

  function startEditTopic(topic) {
    setEditingTopicId(topic.id);
    setEditTopicForm({
      title: topic.title || '',
      category: topic.category || '',
      description: topic.description || '',
      thumbnailUrl: topic.thumbnailUrl || '',
      startDate: topic.startDate || new Date().toISOString().slice(0, 10),
      deadline: topic.deadline || ''
    });
  }

  function cancelEditTopic() {
    setEditingTopicId('');
    setEditTopicForm({ title: '', category: '', description: '', thumbnailUrl: '', startDate: '', deadline: '' });
  }

  async function saveTopicEdit(event) {
    event.preventDefault();
    if (!editingTopicId) return;

    try {
      await api.patch(`/topics/${editingTopicId}`, editTopicForm);
      setMessageType('success');
      setMessage('Topic updated successfully.');
      cancelEditTopic();
      loadData();
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.message || 'Unable to update topic.');
    }
  }

  async function deleteTopic(topic) {
    const confirmed = window.confirm(`Delete "${topic.title}" and all related videos, questions, answers, and progress?`);
    if (!confirmed) return;

    try {
      await api.delete(`/topics/${topic.id}`);
      if (selectedTopicId === topic.id) {
        setSelectedTopicId('');
        setSelectedVideoId('');
        setVideos([]);
      }
      if (editingTopicId === topic.id) {
        cancelEditTopic();
      }
      setMessageType('success');
      setMessage('Topic deleted successfully.');
      loadData();
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.message || 'Unable to delete topic.');
    }
  }

  async function uploadVideo(event) {
    event.preventDefault();
    if (!selectedTopicId || !videoForm.file) {
      setMessageType('error');
      setMessage('Please choose a topic and video file.');
      return;
    }

    const extension = videoForm.file.name.split('.').pop()?.toLowerCase();
    if (!allowedVideoExtensions.includes(extension) || (videoForm.file.type && !allowedVideoMimeTypes.includes(videoForm.file.type))) {
      setMessageType('error');
      setMessage('Only MP4, WebM, and MOV video files are allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('title', videoForm.title);
    formData.append('description', videoForm.description);
    formData.append('order', videoForm.order);
    formData.append('video', videoForm.file);

    try {
      await api.post(`/videos/topic/${selectedTopicId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0
      });
      setMessageType('success');
      setMessage('Video uploaded successfully.');
      setVideoForm({ title: '', description: '', order: 1, file: null });
      const response = await api.get(`/videos/topic/${selectedTopicId}`);
      setVideos(response.data.videos);
      loadData();
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.message || 'Unable to upload video. Check the file and try again.');
    }
  }

  async function addQuestion(event) {
    event.preventDefault();
    if (!selectedVideoId) {
      setMessageType('error');
      setMessage('Please select a video first.');
      return;
    }

    const options = [questionForm.option1, questionForm.option2, questionForm.option3, questionForm.option4]
      .map((item) => item.trim());
    const pauseMinutes = Number(questionForm.pauseMinutes);
    const pauseSeconds = Number(questionForm.pauseSeconds);
    const correctOptionIndex = Number(questionForm.correctOption);

    if (questionForm.pauseMinutes === '' || questionForm.pauseSeconds === '') {
      setMessageType('error');
      setMessage('Pause time cannot be empty.');
      return;
    }

    if (!Number.isInteger(pauseMinutes) || pauseMinutes < 0) {
      setMessageType('error');
      setMessage('Minutes cannot be negative.');
      return;
    }

    if (!Number.isInteger(pauseSeconds) || pauseSeconds < 0 || pauseSeconds > 59) {
      setMessageType('error');
      setMessage('Seconds must be between 0 and 59.');
      return;
    }

    const timestamp = pauseMinutes * 60 + pauseSeconds;
    if (timestamp <= 0) {
      setMessageType('error');
      setMessage('Pause time must be greater than 0.');
      return;
    }

    if (!questionForm.questionText.trim()) {
      setMessageType('error');
      setMessage('Question cannot be empty.');
      return;
    }

    if (options.some((option) => !option)) {
      setMessageType('error');
      setMessage('Please fill in Option 1, Option 2, Option 3, and Option 4.');
      return;
    }

    if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
      setMessageType('error');
      setMessage('Please select the correct option.');
      return;
    }

    try {
      await api.post(`/questions/video/${selectedVideoId}`, {
        timestamp,
        questionText: questionForm.questionText.trim(),
        options,
        correctOptionIndex
      });

      setMessageType('success');
      setMessage('Question added. The video will pause at that timestamp.');
      setQuestionForm({ pauseMinutes: '', pauseSeconds: '', questionText: '', option1: '', option2: '', option3: '', option4: '', correctOption: '' });
      const response = await api.get(`/videos/topic/${selectedTopicId}`);
      setVideos(response.data.videos);
      loadData();
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.message || 'Unable to add question. Check the form and try again.');
    }
  }

  const launched = topics.filter((topic) => topic.status === 'LAUNCHED').length;
  const draft = topics.filter((topic) => topic.status === 'DRAFT').length;
  const questionOptionsReady = [questionForm.option1, questionForm.option2, questionForm.option3, questionForm.option4]
    .every((option) => option.trim());
  const selectedVideo = videos.find((video) => video.id === selectedVideoId);
  const pauseMinutesPreview = Number(questionForm.pauseMinutes);
  const pauseSecondsPreview = Number(questionForm.pauseSeconds);
  const hasPausePreview = questionForm.pauseMinutes !== '' && questionForm.pauseSeconds !== ''
    && Number.isFinite(pauseMinutesPreview)
    && Number.isFinite(pauseSecondsPreview)
    && pauseMinutesPreview >= 0
    && pauseSecondsPreview >= 0
    && pauseSecondsPreview <= 59;
  const pauseTotalSeconds = hasPausePreview ? pauseMinutesPreview * 60 + pauseSecondsPreview : 0;

  function useCurrentVideoTime() {
    const player = questionVideoRef.current;
    if (!player) {
      setMessageType('error');
      setMessage('Select a video before using the current video time.');
      return;
    }

    const currentSeconds = Math.floor(player.currentTime || 0);
    setQuestionForm((current) => ({
      ...current,
      pauseMinutes: String(Math.floor(currentSeconds / 60)),
      pauseSeconds: String(currentSeconds % 60)
    }));
  }

  return (
    <>
      <Navbar />
      <main className="page-shell admin-layout">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">Admin Dashboard</span>
            <h2>Manage training topics, videos, and quiz checkpoints.</h2>
            <p>Create a topic, upload videos, add timestamp questions, then launch it to employees.</p>
          </div>
          <div className="stats-grid compact">
            <div className="stat-card"><strong>{topics.length}</strong><span>Total Topics</span></div>
            <div className="stat-card"><strong>{launched}</strong><span>Launched</span></div>
            <div className="stat-card"><strong>{draft}</strong><span>Draft</span></div>
          </div>
        </section>

        {message && <div className={messageType === 'error' ? 'error-box' : 'success-box'}>{message}</div>}

        <div className="admin-grid">
          <section className="content-card">
            <h2>1. Create Training Topic</h2>
            <form className="form-grid" onSubmit={createTopic}>
              <label>Topic Title<input value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })} required /></label>
              <label>Category<input value={topicForm.category} onChange={(e) => setTopicForm({ ...topicForm, category: e.target.value })} required /></label>
              <label>Start Date<input type="date" value={topicForm.startDate} onChange={(e) => setTopicForm({ ...topicForm, startDate: e.target.value })} /></label>
              <label>Deadline<input type="date" value={topicForm.deadline} onChange={(e) => setTopicForm({ ...topicForm, deadline: e.target.value })} required /></label>
              <label className="span-2">Thumbnail URL<input value={topicForm.thumbnailUrl} onChange={(e) => setTopicForm({ ...topicForm, thumbnailUrl: e.target.value })} /></label>
              <label className="span-2">Description<textarea value={topicForm.description} onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })} /></label>
              <button className="primary-button">Create Topic</button>
            </form>
          </section>

          <section className="content-card">
            <h2>2. Upload Video</h2>
            <form className="form-grid" onSubmit={uploadVideo}>
              <label className="span-2">Select Topic
                <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} required>
                  <option value="">Choose topic</option>
                  {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
                </select>
              </label>
              <label>Video Title<input value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} required /></label>
              <label>Order<input type="number" value={videoForm.order} onChange={(e) => setVideoForm({ ...videoForm, order: e.target.value })} /></label>
              <label className="span-2">Description<textarea value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })} /></label>
              <label className="span-2">Video File<input type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" onChange={(e) => setVideoForm({ ...videoForm, file: e.target.files[0] })} required /></label>
              <button className="primary-button">Upload Video</button>
            </form>
          </section>

          <section className="content-card">
            <h2>3. Add Pause Question</h2>
            <form className="form-grid" onSubmit={addQuestion}>
              <label className="span-2">Select Video
                <select value={selectedVideoId} onChange={(e) => setSelectedVideoId(e.target.value)} required>
                  <option value="">Choose video</option>
                  {videos.map((video) => <option key={video.id} value={video.id}>{video.order}. {video.title}</option>)}
                </select>
              </label>
              {selectedVideo && (
                <div className="span-2 question-video-preview">
                  <video ref={questionVideoRef} controls src={resolveVideoUrl(selectedVideo.videoUrl)} />
                  <button className="outline-button" type="button" onClick={useCurrentVideoTime}>Use Current Video Time</button>
                </div>
              )}
              <div className="span-2 pause-time-group">
                <span>Pause Time</span>
                <div className="pause-time-inputs">
                  <label>Minutes<input type="number" min="0" step="1" value={questionForm.pauseMinutes} onChange={(e) => setQuestionForm({ ...questionForm, pauseMinutes: e.target.value })} required /></label>
                  <label>Seconds<input type="number" min="0" max="59" step="1" value={questionForm.pauseSeconds} onChange={(e) => setQuestionForm({ ...questionForm, pauseSeconds: e.target.value })} required /></label>
                </div>
                <small>Example: 1 minute 30 seconds means the question appears at 01:30.</small>
                <strong>Question will appear at: {hasPausePreview ? formatPauseTime(pauseTotalSeconds) : '--:--'}</strong>
              </div>
              <label className="span-2">Question<textarea value={questionForm.questionText} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} required /></label>
              <label>Option 1<input value={questionForm.option1} onChange={(e) => setQuestionForm({ ...questionForm, option1: e.target.value })} required /></label>
              <label>Option 2<input value={questionForm.option2} onChange={(e) => setQuestionForm({ ...questionForm, option2: e.target.value })} required /></label>
              <label>Option 3<input value={questionForm.option3} onChange={(e) => setQuestionForm({ ...questionForm, option3: e.target.value })} required /></label>
              <label>Option 4<input value={questionForm.option4} onChange={(e) => setQuestionForm({ ...questionForm, option4: e.target.value })} required /></label>
              <label className="span-2">Select Correct Option
                <select value={questionForm.correctOption} onChange={(e) => setQuestionForm({ ...questionForm, correctOption: e.target.value })} disabled={!questionOptionsReady} required>
                  <option value="">{questionOptionsReady ? 'Choose correct option' : 'Enter all options first'}</option>
                  <option value="0">Option 1</option>
                  <option value="1">Option 2</option>
                  <option value="2">Option 3</option>
                  <option value="3">Option 4</option>
                </select>
              </label>
              <button className="primary-button">Add Question</button>
            </form>
          </section>

          <section className="content-card">
            <h2>4. Launch or Edit Topic</h2>
            <div className="topic-admin-list">
              {topics.map((topic) => (
                <div className="admin-topic-row" key={topic.id}>
                  {editingTopicId === topic.id ? (
                    <form className="form-grid topic-edit-form" onSubmit={saveTopicEdit}>
                      <label>Topic Title<input value={editTopicForm.title} onChange={(e) => setEditTopicForm({ ...editTopicForm, title: e.target.value })} required /></label>
                      <label>Category<input value={editTopicForm.category} onChange={(e) => setEditTopicForm({ ...editTopicForm, category: e.target.value })} required /></label>
                      <label>Start Date<input type="date" value={editTopicForm.startDate} onChange={(e) => setEditTopicForm({ ...editTopicForm, startDate: e.target.value })} /></label>
                      <label>Deadline<input type="date" value={editTopicForm.deadline} onChange={(e) => setEditTopicForm({ ...editTopicForm, deadline: e.target.value })} required /></label>
                      <label className="span-2">Thumbnail URL<input value={editTopicForm.thumbnailUrl} onChange={(e) => setEditTopicForm({ ...editTopicForm, thumbnailUrl: e.target.value })} /></label>
                      <label className="span-2">Description<textarea value={editTopicForm.description} onChange={(e) => setEditTopicForm({ ...editTopicForm, description: e.target.value })} /></label>
                      <div className="span-2 edit-actions">
                        <button className="primary-button">Save Changes</button>
                        <button className="outline-button" type="button" onClick={cancelEditTopic}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="topic-row-copy">
                        <strong>{topic.title}</strong>
                        <span>
                          {topic.status} • {topic.videoCount} video(s)
                          {topic.status === 'LAUNCHED' && <span className="status-pill complete inline-status">Live</span>}
                        </span>
                      </div>
                      <div className="edit-actions">
                        <button className="outline-button" onClick={() => startEditTopic(topic)}>Edit</button>
                        {topic.status !== 'LAUNCHED' && <button className="outline-button" onClick={() => launchTopic(topic.id)}>Launch</button>}
                        <button className="danger-button" onClick={() => deleteTopic(topic)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
