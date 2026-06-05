# SkillCheck Deployment Preparation

This project is prepared for GitHub upload with a React/Vite frontend in `client` and a Node/Express backend in `server`.

## Local Setup

Install backend dependencies:

```powershell
cd server
npm install
```

Install frontend dependencies:

```powershell
cd client
npm install
```

## Environment Files

Create the backend environment file:

```powershell
cd server
copy .env.example .env
```

Create the frontend environment file:

```powershell
cd client
copy .env.example .env
```

Do not push `.env` files to GitHub. They can contain database passwords, JWT secrets, and deployed service URLs.

## Database

For local development, start XAMPP MySQL/MariaDB and create the database:

```sql
CREATE DATABASE skillcheck_db;
```

Import:

```text
server/database/schema.sql
```

During deployment, use the cloud MySQL/MariaDB values provided by the hosting service:

```text
DB_HOST
DB_USER
DB_PASSWORD
DB_NAME
DB_PORT
```

Use a strong production value for `JWT_SECRET`.

## Run Locally

Start the backend:

```powershell
cd server
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Start the frontend:

```powershell
cd client
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Test Backend

Open this URL in a browser:

```text
http://localhost:5000
```

Expected response:

```json
{"message":"SkillCheck Training Portal API is running."}
```

Test login with:

```text
employee@company.com / employee123
admin@company.com / admin123
```

## Test Frontend

Open:

```text
http://localhost:5173
```

Confirm:

- Employee login opens the employee dashboard.
- Admin login opens the admin dashboard.
- Video upload, topic creation, quiz questions, reports, and progress still work.

## GitHub Safety Checklist

Before pushing to GitHub, confirm these are not included:

- `.env`
- `node_modules`
- `client/dist`
- `server/uploads`
- uploaded training videos
- database passwords
- JWT secrets

Uploaded videos should be stored outside GitHub. For deployment, use persistent storage or a cloud file service instead of committing local upload files.
