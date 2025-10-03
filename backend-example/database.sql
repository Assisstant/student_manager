-- Student Treatment Manager Database Schema
-- PostgreSQL

-- Drop tables if they exist (for fresh start)
DROP TABLE IF EXISTS student_progress CASCADE;
DROP TABLE IF EXISTS schedule CASCADE;
DROP TABLE IF EXISTS plan_templates CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'teacher',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Students table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    plan_type INTEGER NOT NULL CHECK (plan_type BETWEEN 1 AND 6),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedule table
CREATE TABLE schedule (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday')),
    time_slot INTEGER NOT NULL CHECK (time_slot BETWEEN 0 AND 4),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, day_of_week, time_slot)
);

-- Plan templates table
CREATE TABLE plan_templates (
    id SERIAL PRIMARY KEY,
    plan_type INTEGER NOT NULL CHECK (plan_type BETWEEN 1 AND 6),
    activity_text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student progress table
CREATE TABLE student_progress (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    activity_index INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completion_date VARCHAR(50),
    completion_time VARCHAR(50),
    notes TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, activity_index)
);

-- Indexes for better performance
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_schedule_student_id ON schedule(student_id);
CREATE INDEX idx_schedule_user_id ON schedule(user_id);
CREATE INDEX idx_plan_templates_user_id ON plan_templates(user_id);
CREATE INDEX idx_plan_templates_plan_type ON plan_templates(plan_type);
CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_user_id ON student_progress(user_id);

-- Sample data (optional - for testing)
INSERT INTO users (username, email, password_hash, full_name) VALUES 
('demo', 'demo@example.com', '$2a$10$XZPqBvHmLEaVvbUjPMUUKOWgHqLdOJ3gKUqq7LLXKpkqHPbBMqJpW', 'Demo User');
-- Password is: demo123

-- Comments
COMMENT ON TABLE users IS 'Teachers/therapists using the system';
COMMENT ON TABLE students IS 'Students receiving treatment';
COMMENT ON TABLE schedule IS 'Weekly schedule assignments';
COMMENT ON TABLE plan_templates IS 'Treatment plan activities';
COMMENT ON TABLE student_progress IS 'Student progress tracking';
