const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const userService = require("../services/userService");

const router = express.Router();

// Get all users (admin only)
router.get("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    if (error.message === "Database error") {
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
