const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const authService = require("../services/authService");

const router = express.Router();

// Login
router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;
      const result = await authService.login(username, password);
      res.json(result);
    } catch (error) {
      if (error.message === "Invalid credentials") {
        return res.status(401).json({ error: error.message });
      }
      if (error.message === "Database error") {
        return res.status(500).json({ error: error.message });
      }
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get current user
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json(user);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "Database error") {
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
