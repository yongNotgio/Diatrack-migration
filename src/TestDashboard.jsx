// Test component to verify the dashboard is working
import React from "react";

const TestDashboard = ({ user, onLogout }) => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard Test</h1>
      <p>If you can see this, the component is rendering correctly.</p>
      <p>User: {user ? `${user.first_name} ${user.last_name}` : 'No user data'}</p>
      <button onClick={onLogout} style={{ padding: '10px', margin: '10px' }}>
        Test Logout
      </button>
    </div>
  );
};

export default TestDashboard;
