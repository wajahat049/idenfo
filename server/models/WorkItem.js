const { getDb } = require("../db/database");

// State machine definition
const STATES = {
  DRAFT: "draft",
  IN_REVIEW: "in_review",
  APPROVED: "approved",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  REJECTED: "rejected",
  REWORK: "rework",
};

// Valid state transitions
const STATE_TRANSITIONS = {
  [STATES.DRAFT]: [STATES.IN_REVIEW, STATES.REJECTED],
  [STATES.IN_REVIEW]: [STATES.APPROVED, STATES.REJECTED, STATES.REWORK],
  [STATES.APPROVED]: [STATES.IN_PROGRESS],
  [STATES.IN_PROGRESS]: [STATES.COMPLETED, STATES.REWORK],
  [STATES.COMPLETED]: [],
  [STATES.REJECTED]: [STATES.DRAFT],
  [STATES.REWORK]: [STATES.IN_REVIEW, STATES.DRAFT],
};

// Role-based permissions for state transitions
const ROLE_PERMISSIONS = {
  admin: {
    canTransition: () => true, // Admins can bypass all state transition rules
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canBlock: true,
    canViewAll: true,
  },
  manager: {
    canTransition: (from, to) => STATE_TRANSITIONS[from]?.includes(to),
    canCreate: true,
    canUpdate: true,
    canDelete: false,
    canBlock: true,
    canViewAll: true,
  },
  developer: {
    canTransition: (from, to) => {
      const allowed = [STATES.IN_PROGRESS, STATES.COMPLETED, STATES.REWORK];
      return STATE_TRANSITIONS[from]?.includes(to) && allowed.includes(to);
    },
    canCreate: true,
    canUpdate: true,
    canDelete: false,
    canBlock: false,
    canViewAll: false,
  },
  viewer: {
    canTransition: () => false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canBlock: false,
    canViewAll: true,
  },
};

class WorkItem {
  static STATES = STATES;
  static STATE_TRANSITIONS = STATE_TRANSITIONS;
  static ROLE_PERMISSIONS = ROLE_PERMISSIONS;

  static isValidTransition(from, to) {
    return STATE_TRANSITIONS[from]?.includes(to) || false;
  }

  static canUserTransition(userRole, from, to) {
    const permissions = ROLE_PERMISSIONS[userRole];
    if (!permissions) return false;
    return permissions.canTransition(from, to);
  }

  static create(data) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      const { title, description, created_by } = data;

      db.run(
        `INSERT INTO work_items (title, description, state, created_by) 
         VALUES (?, ?, ?, ?)`,
        [title, description, STATES.DRAFT, created_by],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          const workItemId = this.lastID;

          // Record creation in history
          db.run(
            `INSERT INTO work_item_history 
             (work_item_id, changed_by, change_type, new_value, change_description)
             VALUES (?, ?, ?, ?, ?)`,
            [
              workItemId,
              created_by,
              "created",
              STATES.DRAFT,
              "Work item created",
            ],
            (err) => {
              if (err) {
                console.error("Error recording history:", err);
              }
            }
          );

          resolve(workItemId);
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.get(
        `SELECT wi.*, u.username as created_by_username,
         strftime('%s', wi.created_at) as created_at_timestamp,
         strftime('%s', wi.updated_at) as updated_at_timestamp
         FROM work_items wi
         JOIN users u ON wi.created_by = u.id
         WHERE wi.id = ?`,
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            if (row) {
              // Convert timestamps to ISO strings for consistent timezone handling
              if (row.created_at_timestamp) {
                row.created_at = new Date(
                  parseInt(row.created_at_timestamp) * 1000
                ).toISOString();
              }
              if (row.updated_at_timestamp) {
                row.updated_at = new Date(
                  parseInt(row.updated_at_timestamp) * 1000
                ).toISOString();
              }
            }
            resolve(row);
          }
        }
      );
    });
  }

  static findAll(userRole, userId) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      const permissions = ROLE_PERMISSIONS[userRole];

      let query = `SELECT wi.*, u.username as created_by_username,
                   strftime('%s', wi.created_at) as created_at_timestamp,
                   strftime('%s', wi.updated_at) as updated_at_timestamp
                   FROM work_items wi
                   JOIN users u ON wi.created_by = u.id`;

      // Viewers and developers can only see their own items unless they have canViewAll
      if (!permissions?.canViewAll) {
        query += " WHERE wi.created_by = ?";
        db.all(query, [userId], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // Convert timestamps to ISO strings
            const formattedRows = (rows || []).map((row) => {
              if (row.created_at_timestamp) {
                row.created_at = new Date(
                  parseInt(row.created_at_timestamp) * 1000
                ).toISOString();
              }
              if (row.updated_at_timestamp) {
                row.updated_at = new Date(
                  parseInt(row.updated_at_timestamp) * 1000
                ).toISOString();
              }
              return row;
            });
            resolve(formattedRows);
          }
        });
      } else {
        db.all(query, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // Convert timestamps to ISO strings
            const formattedRows = (rows || []).map((row) => {
              if (row.created_at_timestamp) {
                row.created_at = new Date(
                  parseInt(row.created_at_timestamp) * 1000
                ).toISOString();
              }
              if (row.updated_at_timestamp) {
                row.updated_at = new Date(
                  parseInt(row.updated_at_timestamp) * 1000
                ).toISOString();
              }
              return row;
            });
            resolve(formattedRows);
          }
        });
      }
    });
  }

  static update(id, updates, userId, userRole) {
    return new Promise((resolve, reject) => {
      const db = getDb();

      // Get current work item
      this.findById(id)
        .then((workItem) => {
          if (!workItem) {
            reject(new Error("Work item not found"));
            return;
          }

          // Check if blocked
          if (
            workItem.is_blocked &&
            updates.state &&
            updates.state !== workItem.state
          ) {
            reject(new Error("Cannot change state while work item is blocked"));
            return;
          }

          // Check permissions
          const permissions = ROLE_PERMISSIONS[userRole];
          if (!permissions?.canUpdate) {
            reject(new Error("Insufficient permissions to update work item"));
            return;
          }

          // Validate state transition if state is being changed
          if (updates.state && updates.state !== workItem.state) {
            // For admins, still check if it's a valid transition (they can bypass but should follow rules when possible)
            if (
              userRole !== "admin" &&
              !this.canUserTransition(userRole, workItem.state, updates.state)
            ) {
              reject(
                new Error(
                  `Invalid state transition from ${workItem.state} to ${updates.state}`
                )
              );
              return;
            }
            // For admins, allow any transition but warn if invalid
            if (
              userRole === "admin" &&
              !this.isValidTransition(workItem.state, updates.state)
            ) {
              console.warn(
                `Admin bypassing invalid transition from ${workItem.state} to ${updates.state}`
              );
            }
          }

          // Build update query
          const fields = [];
          const values = [];

          if (updates.title !== undefined) {
            fields.push("title = ?");
            values.push(updates.title);
          }
          if (updates.description !== undefined) {
            fields.push("description = ?");
            values.push(updates.description);
          }
          if (updates.state !== undefined) {
            fields.push("state = ?");
            values.push(updates.state);
          }

          fields.push("updated_at = CURRENT_TIMESTAMP");
          values.push(id);

          db.run(
            `UPDATE work_items SET ${fields.join(", ")} WHERE id = ?`,
            values,
            function (err) {
              if (err) {
                reject(err);
                return;
              }

              // Record history for state changes
              if (updates.state && updates.state !== workItem.state) {
                db.run(
                  `INSERT INTO work_item_history 
                 (work_item_id, changed_by, change_type, old_value, new_value, change_description)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    id,
                    userId,
                    "state_change",
                    workItem.state,
                    updates.state,
                    `State changed from ${workItem.state} to ${updates.state}`,
                  ],
                  (err) => {
                    if (err) console.error("Error recording history:", err);
                  }
                );
              }

              // Record history for other updates
              if (updates.title && updates.title !== workItem.title) {
                db.run(
                  `INSERT INTO work_item_history 
                 (work_item_id, changed_by, change_type, old_value, new_value, change_description)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    id,
                    userId,
                    "title_update",
                    workItem.title,
                    updates.title,
                    "Title updated",
                  ],
                  (err) => {
                    if (err) console.error("Error recording history:", err);
                  }
                );
              }

              if (
                updates.description &&
                updates.description !== workItem.description
              ) {
                db.run(
                  `INSERT INTO work_item_history 
                 (work_item_id, changed_by, change_type, old_value, new_value, change_description)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    id,
                    userId,
                    "description_update",
                    workItem.description,
                    updates.description,
                    "Description updated",
                  ],
                  (err) => {
                    if (err) console.error("Error recording history:", err);
                  }
                );
              }

              resolve(this.lastID);
            }
          );
        })
        .catch(reject);
    });
  }

  static block(id, reason, userId, userRole) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      const permissions = ROLE_PERMISSIONS[userRole];

      if (!permissions?.canBlock) {
        reject(new Error("Insufficient permissions to block work item"));
        return;
      }

      this.findById(id)
        .then((workItem) => {
          if (!workItem) {
            reject(new Error("Work item not found"));
            return;
          }

          if (workItem.is_blocked) {
            reject(new Error("Work item is already blocked"));
            return;
          }

          db.run(
            `UPDATE work_items SET is_blocked = 1, block_reason = ? WHERE id = ?`,
            [reason, id],
            function (err) {
              if (err) {
                reject(err);
                return;
              }

              // Record block event
              db.run(
                `INSERT INTO blocks (work_item_id, blocked_by, reason) VALUES (?, ?, ?)`,
                [id, userId, reason],
                (err) => {
                  if (err) {
                    console.error("Error recording block:", err);
                  }
                }
              );

              // Record in history
              db.run(
                `INSERT INTO work_item_history 
               (work_item_id, changed_by, change_type, change_description)
               VALUES (?, ?, ?, ?)`,
                [id, userId, "blocked", `Work item blocked: ${reason}`],
                (err) => {
                  if (err) console.error("Error recording history:", err);
                }
              );

              resolve();
            }
          );
        })
        .catch(reject);
    });
  }

  static unblock(id, userId, userRole) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      const permissions = ROLE_PERMISSIONS[userRole];

      if (!permissions?.canBlock) {
        reject(new Error("Insufficient permissions to unblock work item"));
        return;
      }

      this.findById(id)
        .then((workItem) => {
          if (!workItem) {
            reject(new Error("Work item not found"));
            return;
          }

          if (!workItem.is_blocked) {
            reject(new Error("Work item is not blocked"));
            return;
          }

          db.run(
            `UPDATE work_items SET is_blocked = 0, block_reason = NULL WHERE id = ?`,
            [id],
            function (err) {
              if (err) {
                reject(err);
                return;
              }

              // Update block record
              db.run(
                `UPDATE blocks SET unblocked_at = CURRENT_TIMESTAMP, unblocked_by = ? 
               WHERE work_item_id = ? AND unblocked_at IS NULL`,
                [userId, id],
                (err) => {
                  if (err) {
                    console.error("Error updating block record:", err);
                  }
                }
              );

              // Record in history
              db.run(
                `INSERT INTO work_item_history 
               (work_item_id, changed_by, change_type, change_description)
               VALUES (?, ?, ?, ?)`,
                [id, userId, "unblocked", "Work item unblocked"],
                (err) => {
                  if (err) console.error("Error recording history:", err);
                }
              );

              resolve();
            }
          );
        })
        .catch(reject);
    });
  }

  static getHistory(id) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.all(
        `SELECT h.*, u.username as changed_by_username,
         strftime('%s', h.created_at) as created_at_timestamp
         FROM work_item_history h
         JOIN users u ON h.changed_by = u.id
         WHERE h.work_item_id = ?
         ORDER BY h.created_at DESC`,
        [id],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // Convert timestamps to ISO strings
            const formattedRows = (rows || []).map((row) => {
              if (row.created_at_timestamp) {
                row.created_at = new Date(
                  parseInt(row.created_at_timestamp) * 1000
                ).toISOString();
              }
              return row;
            });
            resolve(formattedRows);
          }
        }
      );
    });
  }

  static getBlockHistory(id) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.all(
        `SELECT b.*, 
                blocker.username as blocked_by_username,
                unblocker.username as unblocked_by_username
         FROM blocks b
         JOIN users blocker ON b.blocked_by = blocker.id
         LEFT JOIN users unblocker ON b.unblocked_by = unblocker.id
         WHERE b.work_item_id = ?
         ORDER BY b.blocked_at DESC`,
        [id],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }
}

module.exports = WorkItem;
