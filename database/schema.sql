-- Use or create the database
CREATE DATABASE IF NOT EXISTS internlink_uae;
USE internlink_uae;


-- Disable foreign key checks temporarily
-- SET FOREIGN_KEY_CHECKS = 0;

-- Drop child tables first to avoid foreign key issues
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS internships;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS employers;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks
-- SET FOREIGN_KEY_CHECKS = 1;-- 

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'employer', 'university', 'admin') NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' -- For approval if needed
);



CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  university VARCHAR(100),
  major VARCHAR(100),
  cv_link VARCHAR(255),
  profile_image VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
ALTER TABLE students ADD UNIQUE (user_id);
-- جدول الشركات
CREATE TABLE employers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  location VARCHAR(100),
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE internships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(100),
  duration VARCHAR(50),
  requirements TEXT,
  employer_id INT,
  industry VARCHAR(100),
  work_mode VARCHAR(50),         -- Remote, Onsite, Hybrid
  payment_type VARCHAR(20),      -- Paid, Unpaid
  job_type VARCHAR(50),          -- Full-time, Part-time
  start_date DATE,
  salary VARCHAR(100) DEFAULT 'None',
  positions_available INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  FOREIGN KEY (employer_id) REFERENCES employers(id)
);
ALTER TABLE students ADD UNIQUE (user_id);


CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  internship_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (internship_id) REFERENCES internships(id)
);
CREATE TABLE approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  university_id INT,
  application_id INT,
  status VARCHAR(50),              -- e.g., under_review, approved, rejected
  decision_date DATE DEFAULT NULL,
  FOREIGN KEY (university_id) REFERENCES users(id),
  FOREIGN KEY (application_id) REFERENCES applications(id)
);
