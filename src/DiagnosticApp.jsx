import React from "react";

const DiagnosticApp = () => {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: 'blue' }}>🔧 DiaTrack Diagnostic Page</h1>
      <p style={{ color: 'green', fontSize: '18px' }}>
        ✅ React is working!
      </p>
      <p>If you can see this page, React is rendering correctly.</p>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '15px', 
        border: '1px solid #ccc',
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h3>Next steps:</h3>
        <ol>
          <li>Open browser developer tools (F12)</li>
          <li>Check the Console tab for any red error messages</li>
          <li>Look for specific error details</li>
        </ol>
      </div>
    </div>
  );
};

export default DiagnosticApp;
