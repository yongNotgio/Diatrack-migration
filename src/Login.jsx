import React, { useState } from "react";
import "./Login.css";
import landingpic from "/picture/landingpic.jpg";
import logo from "/picture/logo.png"; 

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) {
      setError("Please select a role.");
      return;
    }
    setError("");
    await onLogin(email, password, role, rememberMe);
  };

  return (
    <div className="login-page"> {/* Wrapper for both sections */}

      {/* Form Container */}
      <div className="login-page-wrapper"> 
        <div className="login-form-section">
          <div className="dia-track-logo">
            <img src={logo} alt="DiaTrack Logo" />
            <span className="logo-text">
              <span className="title-blue">Dia</span>
              <span className="title-orange">Track</span>
            </span>
          </div>

          <h1 className="login-heading">Login to Your DiaTrack Account</h1>
          <p className="login-description">
            Please enter your account details to sign in to our platform.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label htmlFor="email">Email or ID</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>
            <div className="input-group password-input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    // Eye icon (visible)
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    // Eye slash icon (hidden)
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
                <option value="secretary">Secretary</option>
              </select>
            </div>

            <div className="form-options-row">
              <a href="#" className="forgot-password">Forgot password?</a>
              <label htmlFor="rememberMe" className="remember-me">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember Me
              </label>
            </div>

            <p className="forgot-password-note">
              Please contact DiaTrack admin for account retrieval.
            </p>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="login-btn">Login</button>
          </form>
        </div>
      </div>

      {/* Illustration Container - now separate */}
      <div className="illustration-section">
        <img src={landingpic} alt="Medical professionals and patient illustration" className="landingpic" />
      </div>

    </div>
  );
};

export default LoginPage;
