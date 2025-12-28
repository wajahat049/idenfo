const WorkItem = require("../models/WorkItem");
const { getDb } = require("../db/database");

class WorkItemService {
  /**
   * Get all work items for a user based on their role
   */
  async getAllWorkItems(userRole, userId) {
    try {
      return await WorkItem.findAll(userRole, userId);
    } catch (error) {
      throw new Error(`Failed to fetch work items: ${error.message}`);
    }
  }

  /**
   * Get a single work item by ID
   */
  async getWorkItemById(id) {
    try {
      const workItem = await WorkItem.findById(id);
      if (!workItem) {
        throw new Error("Work item not found");
      }
      return workItem;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new work item
   */
  async createWorkItem(data, user) {
    try {
      const permissions = WorkItem.ROLE_PERMISSIONS[user.role];
      if (!permissions?.canCreate) {
        throw new Error("Insufficient permissions to create work item");
      }

      const workItemId = await WorkItem.create({
        title: data.title,
        description: data.description,
        created_by: user.id,
      });

      return await WorkItem.findById(workItemId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a work item
   */
  async updateWorkItem(id, updates, user) {
    try {
      const { title, description, state, rework_reason } = updates;
      const updateData = {};

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (state !== undefined) updateData.state = state;

      await WorkItem.update(id, updateData, user.id, user.role);

      // If transitioning to rework, record the reason
      if (state === WorkItem.STATES.REWORK && rework_reason) {
        await this.recordReworkReason(id, user.id, rework_reason);
      }

      return await WorkItem.findById(id);
    } catch (error) {
      // Map specific errors to appropriate HTTP status codes
      if (error.message.includes("blocked")) {
        const err = new Error(error.message);
        err.statusCode = 400;
        throw err;
      }
      if (
        error.message.includes("Invalid state transition") ||
        error.message.includes("Insufficient permissions")
      ) {
        const err = new Error(error.message);
        err.statusCode = 403;
        throw err;
      }
      throw error;
    }
  }

  /**
   * Block a work item
   */
  async blockWorkItem(id, reason, user) {
    try {
      await WorkItem.block(id, reason, user.id, user.role);
      return await WorkItem.findById(id);
    } catch (error) {
      if (error.message.includes("Insufficient permissions")) {
        const err = new Error(error.message);
        err.statusCode = 403;
        throw err;
      }
      const err = new Error(error.message);
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Unblock a work item
   */
  async unblockWorkItem(id, user) {
    try {
      await WorkItem.unblock(id, user.id, user.role);
      return await WorkItem.findById(id);
    } catch (error) {
      if (error.message.includes("Insufficient permissions")) {
        const err = new Error(error.message);
        err.statusCode = 403;
        throw err;
      }
      const err = new Error(error.message);
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Get work item history
   */
  async getWorkItemHistory(id) {
    try {
      return await WorkItem.getHistory(id);
    } catch (error) {
      throw new Error(`Failed to fetch history: ${error.message}`);
    }
  }

  /**
   * Get available state transitions for a work item
   */
  async getAvailableTransitions(id, userRole) {
    try {
      const workItem = await WorkItem.findById(id);
      if (!workItem) {
        throw new Error("Work item not found");
      }

      const currentState = workItem.state;
      const allTransitions = WorkItem.STATE_TRANSITIONS[currentState] || [];

      // Filter based on user permissions
      const allowedTransitions = allTransitions.filter((toState) =>
        WorkItem.canUserTransition(userRole, currentState, toState)
      );

      return {
        currentState,
        availableTransitions: allowedTransitions,
        isBlocked: workItem.is_blocked === 1,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record rework reason in history
   */
  async recordReworkReason(workItemId, userId, reason) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.run(
        `INSERT INTO work_item_history 
         (work_item_id, changed_by, change_type, change_description)
         VALUES (?, ?, ?, ?)`,
        [workItemId, userId, "rework", `Rework reason: ${reason}`],
        (err) => {
          if (err) {
            console.error("Error recording rework reason:", err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}

module.exports = new WorkItemService();
