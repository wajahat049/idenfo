const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "workitems.db");

let db = null;

const getDb = () => {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("Error opening database:", err);
      }
    });
  }
  return db;
};

// Helper function to run SQL and return a promise
const runSQL = (database, sql, params = []) => {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

// Helper function to get SQL and return a promise
const getSQL = (database, sql, params = []) => {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const initDatabase = async () => {
  const database = getDb();

  try {
    // Enable foreign keys
    await runSQL(database, "PRAGMA foreign_keys = ON");

    // Create users table
    await runSQL(
      database,
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Create work_items table
    await runSQL(
      database,
      `
      CREATE TABLE IF NOT EXISTS work_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'draft',
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_blocked INTEGER DEFAULT 0,
        block_reason TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `
    );

    // Create work_item_history table
    await runSQL(
      database,
      `
      CREATE TABLE IF NOT EXISTS work_item_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_item_id INTEGER NOT NULL,
        changed_by INTEGER NOT NULL,
        change_type TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        change_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id)
      )
    `
    );

    // Create blocks table for tracking block/unblock events
    await runSQL(
      database,
      `
      CREATE TABLE IF NOT EXISTS blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_item_id INTEGER NOT NULL,
        blocked_by INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        unblocked_at DATETIME,
        unblocked_by INTEGER,
        FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_by) REFERENCES users(id),
        FOREIGN KEY (unblocked_by) REFERENCES users(id)
      )
    `
    );

    // Create indexes
    await runSQL(
      database,
      "CREATE INDEX IF NOT EXISTS idx_work_items_state ON work_items(state)"
    );
    await runSQL(
      database,
      "CREATE INDEX IF NOT EXISTS idx_work_items_created_by ON work_items(created_by)"
    );
    await runSQL(
      database,
      "CREATE INDEX IF NOT EXISTS idx_history_work_item_id ON work_item_history(work_item_id)"
    );
    await runSQL(
      database,
      "CREATE INDEX IF NOT EXISTS idx_blocks_work_item_id ON blocks(work_item_id)"
    );

    // Initialize default users if they don't exist
    const row = await getSQL(database, "SELECT COUNT(*) as count FROM users");

    if (row.count === 0) {
      const defaultPassword = bcrypt.hashSync("password123", 10);
      const users = [
        {
          username: "admin",
          email: "admin@example.com",
          password_hash: defaultPassword,
          role: "admin",
        },
        {
          username: "manager",
          email: "manager@example.com",
          password_hash: defaultPassword,
          role: "manager",
        },
        {
          username: "developer",
          email: "developer@example.com",
          password_hash: defaultPassword,
          role: "developer",
        },
        {
          username: "viewer",
          email: "viewer@example.com",
          password_hash: defaultPassword,
          role: "viewer",
        },
      ];

      const stmt = database.prepare(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)"
      );
      for (const user of users) {
        await runSQL(
          database,
          "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
          [user.username, user.email, user.password_hash, user.role]
        );
      }
      console.log("Default users created");
    }

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
};

const closeDatabase = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err);
      }
    });
    db = null;
  }
};

module.exports = {
  getDb,
  initDatabase,
  closeDatabase,
};
