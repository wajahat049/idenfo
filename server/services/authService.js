const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db/database");

class AuthService {
  /**
   * Authenticate user and generate JWT token
   */
  async login(username, password) {
    return new Promise((resolve, reject) => {
      const db = getDb();

      db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
          if (err) {
            return reject(new Error("Database error"));
          }

          if (!user) {
            return reject(new Error("Invalid credentials"));
          }

          try {
            const isValidPassword = await bcrypt.compare(
              password,
              user.password_hash
            );
            if (!isValidPassword) {
              return reject(new Error("Invalid credentials"));
            }

            const token = jwt.sign(
              { id: user.id, username: user.username, role: user.role },
              process.env.JWT_SECRET || "your-secret-key-change-in-production",
              { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
            );

            resolve({
              token,
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              },
            });
          } catch (error) {
            reject(new Error("Authentication failed"));
          }
        }
      );
    });
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.get(
        "SELECT id, username, email, role FROM users WHERE id = ?",
        [userId],
        (err, user) => {
          if (err) {
            return reject(new Error("Database error"));
          }
          if (!user) {
            return reject(new Error("User not found"));
          }
          resolve(user);
        }
      );
    });
  }
}

module.exports = new AuthService();
