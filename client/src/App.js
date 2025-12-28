import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import WorkItemsList from "./pages/WorkItemsList";
import WorkItemDetail from "./pages/WorkItemDetail";
import Layout from "./components/Layout";
import "./styles/global/app.css";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout>
                    <WorkItemsList />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/work-items/:id"
              element={
                <PrivateRoute>
                  <Layout>
                    <WorkItemDetail />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
