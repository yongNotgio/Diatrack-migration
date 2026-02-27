// App.jsx (updated with session persistence)
import React, { useState, useEffect } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import LoginPage from "./Login";
import Dashboard from "./Dashboard";
import AdminDashboard from "./AdminDashboard";
import SecretaryDashboard from "./SecretaryDashboard";
import { setAuditMutation, logAuthEvent, logCredentialEvent } from "./auditLogger";
import "./index.css";

const App = () => {
  const [currentPage, setCurrentPage] = useState("login");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const convex = useConvex();
  const createAuditLog = useMutation(api.auditLogs.create);

  // Wire up audit logger with the mutation function
  useEffect(() => {
    setAuditMutation(createAuditLog);
  }, [createAuditLog]);

  const goToLogin = () => setCurrentPage("login");

  // Session persistence - load session on app start
  useEffect(() => {
    const loadSession = () => {
      try {
        const savedUser = sessionStorage.getItem('diatrack_user');
        const savedRole = sessionStorage.getItem('diatrack_role');
        const savedPage = sessionStorage.getItem('diatrack_page');

        if (savedUser && savedRole && savedPage) {
          setUser(JSON.parse(savedUser));
          setRole(savedRole);
          setCurrentPage(savedPage);
          console.log('Session restored:', { role: savedRole, page: savedPage });
        }
      } catch (error) {
        console.error('Error loading session:', error);
        // Clear corrupted session data
        sessionStorage.removeItem('diatrack_user');
        sessionStorage.removeItem('diatrack_role');
        sessionStorage.removeItem('diatrack_page');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Save session whenever user, role, or page changes
  useEffect(() => {
    if (!isLoading) {
      if (user && role && currentPage !== 'login') {
        sessionStorage.setItem('diatrack_user', JSON.stringify(user));
        sessionStorage.setItem('diatrack_role', role);
        sessionStorage.setItem('diatrack_page', currentPage);
      } else if (currentPage === 'login') {
        // Clear session when on login page
        sessionStorage.removeItem('diatrack_user');
        sessionStorage.removeItem('diatrack_role');
        sessionStorage.removeItem('diatrack_page');
      }
    }
  }, [user, role, currentPage, isLoading]);

  const handleLogin = async (email, password, role) => {
    const idField = role === 'admin' ? 'admin_id' : 
                   role === 'doctor' ? 'doctor_id' : 'secretary_id';

    if (!["admin", "doctor", "secretary"].includes(role)) {
      alert("Invalid role selected");
      return;
    }

    try {
      const data = await convex.query(api.auth.login, { email, password, role });

      if (!data) {
        await logCredentialEvent(
          'system',
          'system',
          'System',
          null,
          'login',
          `Failed login attempt for email: ${email} as ${role} - Invalid credentials`,
          'Login Page'
        );
        alert("Login failed: Check credentials");
        return;
      }

      console.log(`Login successful for ${role}:`, data);

      await logAuthEvent(
        role,
        data[idField],
        `${data.first_name} ${data.last_name}`,
        'login',
        'Login Page'
      );

      setUser(data);
      setRole(role);

      if (role === "admin") {
        setCurrentPage("admin-dashboard");
      } else if (role === "doctor") {
        setCurrentPage("doctor-dashboard");
      } else if (role === "secretary") {
        setCurrentPage("secretary-dashboard");
      }
    } catch (err) {
      console.error("Login exception:", err);
      await logCredentialEvent(
        'system',
        'system',
        'System',
        null,
        'login',
        `Failed login attempt for email: ${email} as ${role} - ${err.message}`,
        'Login Page'
      );
      alert("Login failed: An error occurred");
    }
  };

  const handleLogout = async () => {
    // Log logout if user is logged in
    if (user && role) {
      const idField = role === 'admin' ? 'admin_id' : 
                     role === 'doctor' ? 'doctor_id' : 'secretary_id';
      
      await logAuthEvent(
        role,
        user[idField],
        `${user.first_name} ${user.last_name}`,
        'logout',
        'Dashboard'
      );
    }
    
    // Clear session storage on logout
    sessionStorage.removeItem('diatrack_user');
    sessionStorage.removeItem('diatrack_role');
    sessionStorage.removeItem('diatrack_page');
    
    setUser(null);
    setRole("");
    setCurrentPage("login");
  };

  // Show loading spinner while checking for existing session
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {currentPage === "login" && (
        <LoginPage onLogin={handleLogin} />
      )}
      {currentPage === "doctor-dashboard" && (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
       {currentPage === "admin-dashboard" && (
        <AdminDashboard onLogout={handleLogout} user={user} />
      )}
      {currentPage === "secretary-dashboard" && (
        <SecretaryDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;