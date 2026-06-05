# SkillCheck Training Portal

Interactive employee training portal with video-based quiz checkpoints.

## Features

- Employee, Admin, and Manager account roles
- Employee dashboard similar to an LMS front page
- Admin creates training topics
- Admin uploads multiple videos under one topic
- Admin adds questions at specific video timestamps
- Video automatically pauses when a checkpoint question appears
- Employee answers the question before continuing
- Progress, answers, score, and completion are saved
- Admin can launch a topic to employees
- Admin report shows progress and score

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Employee | employee@company.com | employee123 |
| Admin | admin@company.com | admin123 |
| Manager | manager@company.com | manager123 |

## How to Run

### 1. Start the Backend

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Backend will run at:

```bash
http://localhost:5000
```

For Mac/Linux, use this instead of `copy`:

```bash
cp .env.example .env
```

### 2. Start the Frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Frontend will run at:

```bash
http://localhost:5173
```

## Development Flow

1. Login as Admin.
2. Create a training topic.
3. Upload one or more videos.
4. Add questions by timestamp, for example `10` for second 10.
5. Launch the topic.
6. Login as Employee.
7. Open the topic and play the video.
8. The video pauses when the question timestamp is reached.
9. Submit answer and continue the video.
10. Admin checks report.

## Data Storage

This starter version uses a local JSON database:

```bash
server/data/db.json
```

Uploaded videos are stored in:

```bash
server/uploads
```

For production, this can later be upgraded to MySQL, PostgreSQL, MongoDB, or cloud storage.

## Main Pages

- `/login` - user login
- `/dashboard` - employee dashboard
- `/topics/:topicId` - topic details
- `/topics/:topicId/videos/:videoId` - interactive video quiz page
- `/results` - employee result page
- `/admin` - admin management dashboard

## Recommended Next Improvements

- Department-based topic assignment
- Certificate generation after completion
- MySQL or MongoDB database
- Cloud video upload storage
- Question editing and deleting UI
- Stronger report filtering
- Email reminders for deadlines
- Password reset
