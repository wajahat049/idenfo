import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/components/layout.css";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            Work Item Management
          </Link>
          <div className="header-right">
            <span className="user-info">
              {user?.username}
              <span className="role-badge">{user?.role}</span>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
