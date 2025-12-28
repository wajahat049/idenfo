const { getDb } = require("../db/database");

class UserService {
  /**
   * Get all users (admin only)
   */
  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.all(
        "SELECT id, username, email, role, created_at FROM users",
        (err, users) => {
          if (err) {
            return reject(new Error("Database error"));
          }
          resolve(users || []);
        }
      );
    });
  }
}

module.exports = new UserService();
