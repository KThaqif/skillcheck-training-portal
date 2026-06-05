CREATE DATABASE IF NOT EXISTS skillcheck_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE skillcheck_db;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'EMPLOYEE', 'MANAGER') NOT NULL DEFAULT 'EMPLOYEE',
  department VARCHAR(120),
  employee_id VARCHAR(80) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(120) NOT NULL,
  thumbnail TEXT,
  start_date DATE,
  deadline DATE NOT NULL,
  status ENUM('DRAFT', 'LAUNCHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  launched_at DATETIME NULL,
  created_by VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_topics_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(36) PRIMARY KEY,
  topic_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  original_name VARCHAR(255),
  video_order INT NOT NULL DEFAULT 1,
  duration INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_videos_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR(36) PRIMARY KEY,
  video_id VARCHAR(36) NOT NULL,
  timestamp_seconds INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_questions_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS question_options (
  id VARCHAR(36) PRIMARY KEY,
  question_id VARCHAR(36) NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_question_options_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_answers (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(36) NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employee_answer (user_id, question_id),
  CONSTRAINT fk_employee_answers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_answers_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progress (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  topic_id VARCHAR(36) NOT NULL,
  video_id VARCHAR(36) NOT NULL,
  watched_percentage INT NOT NULL DEFAULT 0,
  last_watched_second INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  score INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_progress_video (user_id, topic_id, video_id),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topic_assignments (
  id VARCHAR(36) PRIMARY KEY,
  topic_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL,
  department VARCHAR(120) NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deadline DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
  CONSTRAINT fk_topic_assignments_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_topic_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
