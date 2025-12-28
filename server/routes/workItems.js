const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const WorkItem = require("../models/WorkItem");
const workItemService = require("../services/workItemService");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all work items
router.get("/", async (req, res) => {
  try {
    const workItems = await workItemService.getAllWorkItems(
      req.user.role,
      req.user.id
    );
    res.json(workItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single work item
router.get("/:id", async (req, res) => {
  try {
    const workItem = await workItemService.getWorkItemById(req.params.id);
    res.json(workItem);
  } catch (error) {
    if (error.message === "Work item not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Create work item
router.post(
  "/",
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").notEmpty().withMessage("Description is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const workItem = await workItemService.createWorkItem(req.body, req.user);
      res.status(201).json(workItem);
    } catch (error) {
      if (error.message.includes("Insufficient permissions")) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// Update work item
router.put(
  "/:id",
  [
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("description")
      .optional()
      .notEmpty()
      .withMessage("Description cannot be empty"),
    body("state")
      .optional()
      .isIn(Object.values(WorkItem.STATES))
      .withMessage("Invalid state"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const workItem = await workItemService.updateWorkItem(
        req.params.id,
        req.body,
        req.user
      );
      res.json(workItem);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
);

// Block work item
router.post(
  "/:id/block",
  [body("reason").notEmpty().withMessage("Block reason is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const workItem = await workItemService.blockWorkItem(
        req.params.id,
        req.body.reason,
        req.user
      );
      res.json(workItem);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
);

// Unblock work item
router.post("/:id/unblock", async (req, res) => {
  try {
    const workItem = await workItemService.unblockWorkItem(
      req.params.id,
      req.user
    );
    res.json(workItem);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// Get work item history
router.get("/:id/history", async (req, res) => {
  try {
    const history = await workItemService.getWorkItemHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available state transitions
router.get("/:id/transitions", async (req, res) => {
  try {
    const transitions = await workItemService.getAvailableTransitions(
      req.params.id,
      req.user.role
    );
    res.json(transitions);
  } catch (error) {
    if (error.message === "Work item not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
