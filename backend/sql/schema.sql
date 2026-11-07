CREATE TABLE IF NOT EXISTS faculty (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
   department VARCHAR(80) NOT NULL,
  designation VARCHAR(80),
  max_workload INT NOT NULL DEFAULT 18,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  building VARCHAR(80) NOT NULL,
  type VARCHAR(30) NOT NULL
    CHECK (type IN ('Classroom', 'Laboratory', 'Seminar Hall')),
  capacity INT NOT NULL CHECK (capacity > 0),
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE,
  department VARCHAR(80) NOT NULL,
  semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  students INT NOT NULL CHECK (students > 0),
  shift VARCHAR(20) NOT NULL DEFAULT 'Shift 1',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  department VARCHAR(80) NOT NULL,
  semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  credits INT NOT NULL CHECK (credits > 0),
  weekly_hours INT NOT NULL CHECK (weekly_hours > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Faculty preferences used by the soft-constraint scoring (safe to re-run)
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS preferred_window VARCHAR(20) NOT NULL DEFAULT 'any';

-- Versioned timetables: draft -> submitted -> approved -> published (-> archived)
CREATE TABLE IF NOT EXISTS timetable_versions (
  id SERIAL PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'published', 'archived', 'rejected')),
  payload JSONB NOT NULL,
  score JSONB,
  note TEXT,
  created_by VARCHAR(160) NOT NULL,
  reviewed_by VARCHAR(160),
  reviewed_at TIMESTAMP,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Change / substitution requests raised by faculty or coordinators
CREATE TABLE IF NOT EXISTS change_requests (
  id SERIAL PRIMARY KEY,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  details TEXT,
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by VARCHAR(160) NOT NULL,
  requester_role VARCHAR(20) NOT NULL,
  payload JSONB,
  resolution TEXT,
  resolved_by VARCHAR(160),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Who did what, when
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  actor VARCHAR(160) NOT NULL,
  role VARCHAR(20) NOT NULL,
  action VARCHAR(60) NOT NULL,
  detail TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
