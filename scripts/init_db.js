import Database from "better-sqlite3";
const db = new Database("data/resume.db");

db.exec(`
CREATE TABLE IF NOT EXISTS resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT,
  analysis TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

console.log("✅ Database ready!");
db.close();
