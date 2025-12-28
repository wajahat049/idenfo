import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { formatDate, formatRelativeTime } from "../utils/dateUtils";
import "../styles/pages/workItemDetail.css";

const WorkItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [workItem, setWorkItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [transitions, setTransitions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", description: "" });
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showReworkForm, setShowReworkForm] = useState(false);
  const [reworkReason, setReworkReason] = useState("");
  const [targetState, setTargetState] = useState("");

  useEffect(() => {
    fetchWorkItem();
    fetchHistory();
    fetchTransitions();
  }, [id]);

  const fetchWorkItem = async () => {
    try {
      const response = await api.get(`/api/work-items/${id}`);
      setWorkItem(response.data);
      setEditData({
        title: response.data.title,
        description: response.data.description,
      });
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load work item");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get(`/api/work-items/${id}/history`);
      setHistory(response.data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const fetchTransitions = async () => {
    try {
      const response = await api.get(`/api/work-items/${id}/transitions`);
      setTransitions(response.data);
    } catch (err) {
      console.error("Failed to load transitions:", err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/work-items/${id}`, editData);
      await fetchWorkItem();
      await fetchHistory();
      setIsEditing(false);
      showSuccess("Work item updated successfully");
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to update work item";
      setError(errorMsg);
      showError(errorMsg);
    }
  };

  const handleStateTransition = async (state = null) => {
    try {
      const transitionState = state || targetState;
      const updates = { state: transitionState };
      if (transitionState === "rework" && reworkReason) {
        // We'll send rework_reason in the request body
        await api.put(`/api/work-items/${id}`, {
          ...updates,
          rework_reason: reworkReason,
        });
      } else {
        await api.put(`/api/work-items/${id}`, updates);
      }
      await fetchWorkItem();
      await fetchHistory();
      await fetchTransitions();
      setShowReworkForm(false);
      setReworkReason("");
      setTargetState("");
      setError("");
      showSuccess("State transition successful");
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to transition state";
      setError(errorMsg);
      showError(errorMsg);
    }
  };

  const handleBlock = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/work-items/${id}/block`, { reason: blockReason });
      await fetchWorkItem();
      await fetchHistory();
      await fetchTransitions();
      setShowBlockForm(false);
      setBlockReason("");
      showSuccess("Work item blocked successfully");
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to block work item";
      setError(errorMsg);
      showError(errorMsg);
    }
  };

  const handleUnblock = async () => {
    try {
      await api.post(`/api/work-items/${id}/unblock`);
      await fetchWorkItem();
      await fetchHistory();
      await fetchTransitions();
      showSuccess("Work item unblocked successfully");
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to unblock work item";
      setError(errorMsg);
      showError(errorMsg);
    }
  };

  const getStateClass = (state) => {
    return `state-badge state-${state}`;
  };

  const canEdit = user?.role !== "viewer";
  const canBlock = ["admin", "manager"].includes(user?.role);
  const canTransition = user?.role !== "viewer";

  console.log("history", history);

  if (loading) {
    return (
      <div className="container">
        <div className="skeleton-card">
          <div
            className="skeleton skeleton-title"
            style={{ width: "40%" }}
          ></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
          <div
            className="skeleton skeleton-text"
            style={{ width: "60%" }}
          ></div>
        </div>
        <div className="skeleton-card">
          <div
            className="skeleton skeleton-title"
            style={{ width: "30%" }}
          ></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
        </div>
      </div>
    );
  }

  if (!workItem) {
    return (
      <div className="container">
        <div className="error-message">Work item not found</div>
      </div>
    );
  }

  return (
    <div className="container">
      <button
        onClick={() => navigate("/")}
        className="btn btn-secondary"
        style={{ marginBottom: "15px" }}
      >
        ← Back to List
      </button>

      {error && <div className="error-message">⚠ {error}</div>}

      {/* Blocked Banner */}
      {workItem.is_blocked === 1 && (
        <div className="blocked-banner">
          <span>⚠</span>
          <div>
            <strong>This work item is blocked</strong>
            {workItem.block_reason && (
              <div style={{ marginTop: "4px", fontSize: "13px" }}>
                Reason: {workItem.block_reason}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="work-item-header-detail">
          <div>
            {isEditing ? (
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1>{workItem.title}</h1>
                <div className="work-item-meta-detail">
                  <span className={getStateClass(workItem.state)}>
                    {workItem.state.replace("_", " ")}
                  </span>
                  {workItem.is_blocked === 1 && (
                    <span className="blocked-badge">⚠ Blocked</span>
                  )}
                </div>
                <p className="work-item-description-detail">
                  {workItem.description}
                </p>
                <div className="work-item-info">
                  <p>
                    <strong>Created by:</strong> {workItem.created_by_username}
                  </p>
                  <p>
                    <strong>Created:</strong> {formatDate(workItem.created_at)}
                  </p>
                  <p>
                    <strong>Last updated:</strong>{" "}
                    {formatDate(workItem.updated_at)}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-primary"
                    style={{ marginTop: "15px" }}
                  >
                    Edit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="card actions-panel">
        <h2>Actions</h2>
        {workItem.is_blocked === 1 ? (
          canBlock && (
            <button onClick={handleUnblock} className="btn btn-success">
              Unblock Work Item
            </button>
          )
        ) : (
          <>
            {canBlock && (
              <>
                {!showBlockForm ? (
                  <button
                    onClick={() => setShowBlockForm(true)}
                    className="btn btn-danger"
                    style={{ marginBottom: "15px" }}
                  >
                    Block Work Item
                  </button>
                ) : (
                  <form onSubmit={handleBlock} style={{ marginBottom: "15px" }}>
                    <div className="form-group">
                      <label>Block Reason</label>
                      <textarea
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        required
                        placeholder="Explain why this work item is being blocked"
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-danger">
                        Confirm Block
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBlockForm(false);
                          setBlockReason("");
                        }}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {canTransition && transitions && (
              <div className="state-transitions">
                <h3>State Transitions</h3>
                {transitions.availableTransitions.length === 0 ? (
                  <p className="no-transitions">
                    No available state transitions from current state.
                  </p>
                ) : (
                  <>
                    {!showReworkForm ? (
                      <div className="transition-buttons">
                        {transitions.availableTransitions.map((state) => (
                          <button
                            key={state}
                            onClick={() => {
                              setTargetState(state);
                              if (state === "rework") {
                                setShowReworkForm(true);
                              } else {
                                handleStateTransition(state);
                              }
                            }}
                            className="btn btn-primary"
                            style={{
                              marginRight: "10px",
                              marginBottom: "10px",
                            }}
                          >
                            Transition to {state.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleStateTransition(targetState);
                        }}
                      >
                        <div className="form-group">
                          <label>Rework Reason</label>
                          <textarea
                            value={reworkReason}
                            onChange={(e) => setReworkReason(e.target.value)}
                            required
                            placeholder="Explain why this work item needs rework"
                          />
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="btn btn-primary">
                            Confirm Rework
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowReworkForm(false);
                              setReworkReason("");
                              setTargetState("");
                            }}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
                {transitions.isBlocked && (
                  <p className="error-message">
                    This work item is blocked and cannot transition states.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* History Section */}
      <div className="card">
        <h2>History</h2>
        {history.length === 0 ? (
          <p>No history available.</p>
        ) : (
          <div className="history-list">
            {history.map((entry) => (
              <div key={entry.id} className="history-item">
                <div className="history-header">
                  <span className="history-type">{entry.change_type}</span>
                  <span className="history-user">
                    by {entry.changed_by_username}
                  </span>
                  <span
                    className="history-date"
                    title={formatDate(entry.created_at)}
                  >
                    {formatRelativeTime(entry.created_at)}
                  </span>
                </div>
                <div className="history-description">
                  {entry.change_description}
                </div>
                {entry.old_value && entry.new_value && (
                  <div className="history-change">
                    <span className="history-old">{entry.old_value}</span>
                    <span> → </span>
                    <span className="history-new">{entry.new_value}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkItemDetail;
