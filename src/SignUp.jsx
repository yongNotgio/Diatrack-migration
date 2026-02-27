import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import "./signup.css";
import logo from "/picture/logo.png";

const SignUpPage = ({ onSignUp, goToLogin }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signUpDoctor = useMutation(api.auth.signUpDoctor);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError("Please enter both first and last name.");
      setLoading(false);
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter an email.");
      setLoading(false);
      return;
    }

    if (!trimmedPassword) {
      setError("Please enter a password.");
      setLoading(false);
      return;
    }

    if (!specialization) {
      setError("Please select a specialization.");
      setLoading(false);
      return;
    }

    try {
      await signUpDoctor({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        password: trimmedPassword,
        specialization: specialization,
      });

      setLoading(false);
      alert("Doctor added successfully!");
      if (onSignUp) {
        onSignUp({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          password: trimmedPassword,
          specialization: specialization,
        });
      }
      goToLogin();
    } catch (insertError) {
      setLoading(false);
      console.error("Insert Error:", insertError);
      setError(`Failed to add Doctor: ${insertError.message}`);
    }
  };

  return (
    <div className="signup-container">
      <div className="left-panel">
        <h1 className="logo-text">
          <span className="dia-text" style={{ color: "#00aaff" }}>
            Dia
          </span>
          <span className="track-text" style={{ color: "#ff9800" }}>
            Track
          </span>
        </h1>
        <div className="logo-placeholder">
          <img src={logo} alt="DiaTrack Logo" className="app-logo" />
        </div>
      </div>
      <div className="right-panel">
        <div className="signup-form">
          <h2>Create Account</h2>
          <form onSubmit={handleAddDoctor}>
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="specialization">Specialization</label>
              <select
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
              >
                <option value="">Select Specialization</option>
                <option value="Endocrinologist">Endocrinologist</option>
                <option value="Nutritionist">Nutritionist</option>
                <option value="Optamologist">Optamologist</option>
              </select>
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={loading}>
              Create Account
            </button>
          </form>
          <p className="switch-link">
            Already have an account? <span onClick={goToLogin}>Log In</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;