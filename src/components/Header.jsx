import React, { useState, useEffect } from 'react';
import './Header.css';
import logo from '/picture/logo.png';
import { useConvex, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const Header = ({ 
  user, 
  activePage, 
  setActivePage, 
  onLogout, 
  showUsersPopup, 
  setShowUsersPopup, 
  showMessagePopup, 
  setShowMessagePopup,
  userRole = 'Secretary' // Default role, can be overridden
}) => {
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const convex = useConvex();
  const markReadMutation = useMutation(api.notifications.markRead);
  const markAllReadMutation = useMutation(api.notifications.markAllRead);
  const createNotification = useMutation(api.notifications.create);
  const checkSpecialistExists = useMutation(api.patientSpecialists.create);
  const createSpecialist = useMutation(api.patientSpecialists.create);

  // Helper to get userId and userType from current user/role
  const getUserInfo = () => {
    let userId, userType;
    if (userRole === 'Secretary' && user?.secretary_id) {
      userId = user.secretary_id;
      userType = 'secretary';
    } else if (userRole === 'Doctor' && user?.doctor_id) {
      userId = user.doctor_id;
      userType = 'doctor';
    } else if (user?.admin_id) {
      userId = user.admin_id;
      userType = 'admin';
    }
    return { userId, userType };
  };

  // Fetch notifications for the current user
  const fetchNotifications = async () => {
    if (!user) return;
    const { userId, userType } = getUserInfo();
    if (!userId) return;

    try {
      const data = await convex.query(api.notifications.listByUser, {
        userId: String(userId),
        userRole: userType,
      });
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // Auto-fetch notifications when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      // Clear notifications if no user
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, userRole]); // Re-run when user or userRole changes

  // Handle opening notifications popup
  const handleOpenNotifications = async () => {
    setLoadingNotifications(true);
    await fetchNotifications();
    setLoadingNotifications(false);
    setShowUsersPopup(true);
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await markReadMutation({ id: notificationId });
      setNotifications(notifications.map(notif => 
        (notif._id || notif.notification_id) === notificationId 
          ? { ...notif, is_read: true } 
          : notif
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    const { userId, userType } = getUserInfo();
    if (!userId) return;

    try {
      await markAllReadMutation({ userId: String(userId), userRole: userType });
      setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notif) => {
    // Mark as read if unread
    if (!notif.is_read) {
      await markNotificationAsRead(notif._id || notif.notification_id);
    }

    // Handle specialist assignment confirmation for doctors
    if (userRole === 'Doctor' && notif.type === 'patient' && notif.message && notif.message.startsWith('ASSIGNMENT_REQUEST:')) {
      let patientId, patientName, secretaryId, secretaryName;
      
      if (notif.message && notif.message.startsWith('ASSIGNMENT_REQUEST:')) {
        const data = notif.message.replace('ASSIGNMENT_REQUEST:', '').split('|');
        patientId = data[0];
        patientName = data[1] || 'Unknown Patient';
        secretaryId = data[2];
        secretaryName = data[3] || 'Secretary';
      } else {
        patientName = 'a patient';
        alert('Unable to process this assignment request. Please contact the administrator.');
        setShowUsersPopup(false);
        return;
      }

      const confirmAssignment = window.confirm(
        `Do you want to accept the assignment for patient: ${patientName}?\n\nClick OK to confirm or Cancel to reject.`
      );

      if (confirmAssignment) {
        try {
          // Check if already assigned
          const exists = await convex.query(api.patientSpecialists.exists, {
            patientId: patientId,
            doctorId: user.doctor_id,
          });

          if (exists) {
            alert(`You are already assigned to ${patientName}.`);
          } else {
            await createSpecialist({
              patient_id: patientId,
              doctor_id: user.doctor_id,
              specialization: null,
            });

            alert(`You have successfully accepted the assignment for ${patientName}.`);
            
            if (secretaryId) {
              await createNotification({
                user_id: String(secretaryId),
                user_role: 'secretary',
                type: 'patient',
                title: 'Specialist Assignment Confirmed',
                message: `Dr. ${user.first_name} ${user.last_name} has confirmed the assignment for patient: ${patientName}.`,
                is_read: false,
              });
            }

            if (patientId) {
              await createNotification({
                user_id: String(patientId),
                user_role: 'patient',
                type: 'patient',
                title: 'New Specialist Assigned',
                message: `Dr. ${user.first_name} ${user.last_name} has been assigned to your care.`,
                is_read: false,
              });
            }
          }
        } catch (err) {
          alert(`Error confirming assignment: ${err.message}`);
        }
      } else {
        alert(`You have rejected the assignment for ${patientName}.`);
        
        if (secretaryId) {
          try {
            await createNotification({
              user_id: String(secretaryId),
              user_role: 'secretary',
              type: 'patient',
              title: 'Specialist Assignment Rejected',
              message: `Dr. ${user.first_name} ${user.last_name} has rejected the assignment for patient: ${patientName}.`,
              is_read: false,
            });
          } catch (err) {
            console.error("Error sending rejection notification:", err);
          }
        }
      }

      await fetchNotifications();
      setShowUsersPopup(false);
      return;
    }

    // Handle navigation based on notification type and user role
    if (userRole === 'Admin') {
      if (notif.type === 'appointment' || notif.type === 'Appointment') {
        setActivePage('dashboard');
        setShowUsersPopup(false);
      } else if (notif.type === 'user_management' || notif.type === 'User Management') {
        setActivePage('manage');
        setShowUsersPopup(false);
      } else if (notif.type === 'compliance' || notif.type === 'Compliance') {
        setActivePage('compliance');
        setShowUsersPopup(false);
      } else if (notif.type === 'audit' || notif.type === 'Audit') {
        setActivePage('audit');
        setShowUsersPopup(false);
      } else {
        setActivePage('dashboard');
        setShowUsersPopup(false);
      }
    } else {
      // For Secretary/Doctor roles
      if (notif.type === 'appointment' || notif.type === 'Appointment') {
        setActivePage('dashboard');
        setShowUsersPopup(false);
      } else if (notif.type === 'patient' || notif.type === 'Patient') {
        setActivePage('patient-list');
        setShowUsersPopup(false);
      } else if (notif.type === 'report' || notif.type === 'Report') {
        setActivePage('reports');
        setShowUsersPopup(false);
      } else {
        setActivePage('dashboard');
        setShowUsersPopup(false);
      }
    }
  };
  // Helper function to determine which main tab should be active
  const getActiveTab = () => {
    // Dashboard-related pages
    if (activePage === "dashboard" || activePage === "create-patient") {
      return "dashboard";
    }
    // Patient List-related pages (includes patient profile, treatment plan, specialist assignment, lab entry)
    if (activePage === "patient-list" || activePage === "patient-detail-view" || 
        activePage === "patient-profile" || activePage === "specialist-assignment" || 
        activePage === "lab-result-entry" || activePage === "treatment-plan" || 
        activePage === "treatment-plan-next-step" || activePage === "treatment-plan-summary") {
      return "patient-list";
    }
    // Appointments-related pages
    if (activePage === "appointments") {
      return "appointments";
    }
    // Reports-related pages
    if (activePage === "reports" || activePage === "report-detail") {
      return "reports";
    }
    return activePage;
  };

  const activeTab = getActiveTab();
  const formatNotificationTime = (dateValue) => {
    try {
      return new Date(dateValue).toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  const getNotificationTag = (type) => {
    const normalized = String(type || '').toLowerCase();
    if (normalized.includes('appointment')) return { label: 'Appointment', className: 'tag-appointment' };
    if (normalized.includes('patient')) return { label: 'Patient', className: 'tag-patient' };
    if (normalized.includes('report')) return { label: 'Report', className: 'tag-report' };
    if (normalized.includes('message')) return { label: 'Message', className: 'tag-message' };
    if (normalized.includes('audit')) return { label: 'Audit', className: 'tag-audit' };
    return { label: 'Notice', className: 'tag-notice' };
  };

  return (
    <>
      <div className="top-navbar">
        <h1 className="app-title">
          <img src={logo} alt="DiaTrack Logo" className="app-logo" />
          <img src="/picture/diatracktext.png" alt="diatracktext" className="diatracktext" />
        </h1>
        {userRole !== 'Admin' && (
          <ul className="navbar-menu">
            <li className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActivePage("dashboard")}>Dashboard</li>
            <li className={activeTab === "patient-list" ? "active" : ""} onClick={() => setActivePage("patient-list")}>Patient List</li>
            <li className={activeTab === "appointments" ? "active" : ""} onClick={() => setActivePage("appointments")}>Appointments</li>
            <li className={activeTab === "reports" ? "active" : ""} onClick={() => setActivePage("reports")}>Reports</li>
          </ul>
        )}
        <div className="navbar-right">
          <button className="notification-icon" onClick={handleOpenNotifications}>
            <img src="/picture/notif.svg" alt="Notifications" className="header-icon-img" />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          <div className="user-profile">
            <img 
              src={userRole === 'Secretary' ? "/picture/secretary.png" : 
                userRole === 'Admin' ? "/picture/secretary.png" :  "https://placehold.co/40x40/aabbcc/ffffff?text=User"} 
                alt="User Avatar" 
                className="user-avatar" 
              onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/40x40/aabbcc/ffffff?text=User"; }}
            />
            <div className="user-info">
              <span className="user-name">{user ? `${user.first_name} ${user.last_name}` : 'Maria Batumbakal'}</span>
              <span className="user-role">{userRole}</span>
            </div>
            <button className="signout-button4" onClick={() => {
              if (window.confirm("Are you sure you want to sign out?")) onLogout();
            }}>
              <img src="/picture/signout.svg" alt="Sign Out" className="header-icon-img" />
            </button>
          </div>
        </div>
        
        {/* Pop-up for Notification Icon */}
        {showUsersPopup && (
          <div className="popup-overlay" onClick={() => setShowUsersPopup(false)}>
            <div className="popup-content notifications-popup" onClick={(e) => e.stopPropagation()}>
              <div className="popup-header">
                <h3>Notifications</h3>
                <div className="popup-header-actions">
                  {unreadCount > 0 && (
                    <button 
                      className="read-all-btn" 
                      onClick={markAllNotificationsAsRead}
                      title="Mark all as read"
                    >
                      Read All
                    </button>
                  )}
                  <button className="close-btn" onClick={() => setShowUsersPopup(false)}>
                    <img src="/picture/close.png" alt="Close" className="close-icon" />
                  </button>
                </div>
              </div>
              <div className="notifications-list">
                {loadingNotifications ? (
                  <div className="no-notifications">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading notifications...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div key={notif._id || notif.notification_id} className={`notification-item ${!notif.is_read ? 'unread' : ''}`} onClick={() => handleNotificationClick(notif)}>
                      <div className="notification-top-row">
                        <span className={`notification-type-tag ${getNotificationTag(notif.type).className}`}>
                          {getNotificationTag(notif.type).label}
                        </span>
                        <span className="notification-time">{formatNotificationTime(notif.created_at)}</span>
                      </div>
                      <div className="notification-title-row">
                        <strong>{notif.title}</strong>
                        {!notif.is_read && <span className="unread-badge">New</span>}
                      </div>
                      <div className="notification-message">{notif.message}</div>
                      <div className="notification-sender">
                        {notif.user_role ? String(notif.user_role).charAt(0).toUpperCase() + String(notif.user_role).slice(1) : 'System'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">
                    <i className="fas fa-bell-slash"></i>
                    <p>No notifications at this time</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pop-up for Message Icon */}
        {showMessagePopup && (
          <div className="popup-overlay">
            <div className="popup-content">
              <h3>Messages</h3>
              <p>You have new messages!</p>
              <button onClick={() => setShowMessagePopup(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Header;
