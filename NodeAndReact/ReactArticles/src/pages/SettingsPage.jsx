import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classes from './SettingsPage.module.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);

  // Get current user info
const currentUser = JSON.parse(sessionStorage.getItem('user')) || {};

const handleLogout = () => {
    // Show confirmation dialog
    setShowConfirmLogout(true);
};

const confirmLogout = () => {
    // Clear session storage
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    // Redirect to login page
    navigate('/');
};

const handleSwitchAccount = () => {
    // Show confirmation dialog
    setShowConfirmSwitch(true);
};

  const confirmSwitchAccount = () => {
    // Clear current user but keep any other session data if needed
    sessionStorage.removeItem('user');
    // Redirect to login page
    navigate('/');
  };

  const handleBackToHome = () => {
    // Navigate back to the appropriate home page based on user role
    if (currentUser && currentUser.role) {
      navigate(`/${currentUser.role}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={classes.container}>
      <h1>הגדרות</h1>
      <div className={classes.settingsCard}>
        <div className={classes.userInfo}>
          <div className={classes.userIcon}>👤</div>
          <div className={classes.userDetails}>
            <h2>{currentUser.name || 'משתמש'}</h2>
            <p>{currentUser.role || 'תפקיד לא ידוע'}</p>
            <p>{currentUser.email || ''}</p>
          </div>
        </div>

        <div className={classes.settingsOptions}>
          <button 
            className={classes.settingsButton} 
            onClick={handleSwitchAccount}
          >
            <span className={classes.icon}>🔄</span>
            החלפת משתמש/חשבון
          </button>
          
          <button 
            className={classes.settingsButton} 
            onClick={handleLogout}
          >
            <span className={classes.icon}>🚪</span>
            התנתקות
          </button>
          
          <button 
            className={classes.settingsButton} 
            onClick={handleBackToHome}
          >
            <span className={classes.icon}>🏠</span>
            חזרה לדף הבית
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showConfirmLogout && (
        <div className={classes.modalOverlay}>
          <div className={classes.modal}>
            <h3>האם אתה בטוח שברצונך להתנתק?</h3>
            <div className={classes.modalButtons}>
              <button 
                className={`${classes.modalButton} ${classes.confirmButton}`} 
                onClick={confirmLogout}
              >
                כן, התנתק
              </button>
              <button 
                className={`${classes.modalButton} ${classes.cancelButton}`} 
                onClick={() => setShowConfirmLogout(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Account Confirmation Dialog */}
      {showConfirmSwitch && (
        <div className={classes.modalOverlay}>
          <div className={classes.modal}>
            <h3>האם אתה בטוח שברצונך להחליף משתמש?</h3>
            <div className={classes.modalButtons}>
              <button 
                className={`${classes.modalButton} ${classes.confirmButton}`} 
                onClick={confirmSwitchAccount}
              >
                כן, החלף משתמש
              </button>
              <button 
                className={`${classes.modalButton} ${classes.cancelButton}`} 
                onClick={() => setShowConfirmSwitch(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}