import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { formatDateShort } from "../utils/dateUtils";
import "../styles/pages/workItemsList.css";

const WorkItemsList = () => {
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", description: "" });
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchWorkItems();
  }, []);

  const fetchWorkItems = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/work-items");
      setWorkItems(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load work items");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/work-items", newItem);
      setWorkItems([response.data, ...workItems]);
      setNewItem({ title: "", description: "" });
      setShowCreateForm(false);
      setError("");
      showSuccess("Work item created successfully");
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to create work item";
      setError(errorMsg);
      showError(errorMsg);
    }
  };

  const canCreate = user?.role !== "viewer";

  const getStateClass = (state) => {
    return `state-badge state-${state}`;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="skeleton-card">
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
        </div>
        <div className="skeleton-card">
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Work Items</h1>
        {canCreate && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary"
          >
            {showCreateForm ? "Cancel" : "Create Work Item"}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreateForm && (
        <div className="card">
          <h2>Create New Work Item</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) =>
                  setNewItem({ ...newItem, title: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </form>
        </div>
      )}

      {workItems.length === 0 ? (
        <div className="card">
          <p>No work items found. Create one to get started!</p>
        </div>
      ) : (
        <div className="work-items-grid">
          {workItems.map((item) => (
            <Link
              key={item.id}
              to={`/work-items/${item.id}`}
              className="work-item-card"
            >
              <div className="work-item-header">
                <h3>{item.title}</h3>
                <div>
                  <span className={getStateClass(item.state)}>
                    {item.state.replace("_", " ")}
                  </span>
                  {item.is_blocked === 1 && (
                    <span className="blocked-badge">⚠ Blocked</span>
                  )}
                </div>
              </div>
              <p className="work-item-description">
                {item.description.length > 100
                  ? `${item.description.substring(0, 100)}...`
                  : item.description}
              </p>
              <div className="work-item-footer">
                <span className="work-item-meta">
                  Created by {item.created_by_username}
                </span>
                <span className="work-item-meta">
                  {formatDateShort(item.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkItemsList;
