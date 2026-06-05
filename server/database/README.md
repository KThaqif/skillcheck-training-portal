# SkillCheck MySQL Setup

The backend now uses MySQL or MariaDB through XAMPP instead of `server/data/db.json`.

## XAMPP Setup

1. Open XAMPP Control Panel.
2. Start `Apache`.
3. Start `MySQL`.
4. Open phpMyAdmin: `http://localhost/phpmyadmin`.
5. Create a database named `skillcheck_db`.
6. Open the `Import` tab.
7. Choose `server/database/schema.sql`.
8. Click `Import`.

## Environment

Confirm `server/.env` contains:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=skillcheck_db
DB_PORT=3306
JWT_SECRET=skillcheck_secret_key
CLIENT_URL=http://localhost:5173
```

## Run

Start the backend:

```powershell
cd C:\Users\THAQIF\Desktop\skillcheck-training-portal\server
npm.cmd install
npm.cmd run dev
```

Start the frontend in a second terminal:

```powershell
cd C:\Users\THAQIF\Desktop\skillcheck-training-portal\client
npm.cmd install
npm.cmd run dev
```

The backend seeds demo accounts when it starts successfully.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@company.com | admin123 |
| Employee | employee@company.com | employee123 |
