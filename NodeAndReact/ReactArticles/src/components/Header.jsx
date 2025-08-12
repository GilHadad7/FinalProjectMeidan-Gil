import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import classes from "../components/Header.module.css";
import logo from "../../src/assets/img/new1.jpg";
import SettingsCog from "../components/SettingsCog"; // ⬅️ חדש

function Header() {
  const navigate = useNavigate();

  // קריאת המשתמש מ-sessionStorage פעם אחת
  const rawUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const roleHe = (r) =>
    r === "manager" ? "מנהל" :
    r === "worker"  ? "עובד"  :
    r === "tenant"  ? "דייר"  : r || "";

  const currentUser = rawUser ? { ...rawUser, roleHe: roleHe(rawUser.role) } : null;

  const handleLogoClick = () => {
    if (currentUser?.role) {
      navigate(`/${currentUser.role}`);
    } else {
      navigate("/");
    }
  };

  return (
    <header className={classes.header}>
      <div className={classes.logoSection} onClick={handleLogoClick}>
        <img src={logo} alt="Logo" className={classes.logo} />
        <span className={classes.slogan}>C&H Building Management</span>
      </div>

      {/* ⚙️ פותח פאנל הגדרות מהיר במקום מעבר לעמוד */}
      <div className={classes.settings}>
        <SettingsCog
          user={currentUser}
          onLogout={() => {
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
            navigate("/"); // או "/login" לפי הזרימה שלך
          }}
          onSwitchAccount={() => {
            sessionStorage.removeItem("user");
            navigate("/"); // החלפת משתמש -> מסך התחברות/דף בית
          }}
          onOpenFull={() => navigate("/settings")} // מעבר לעמוד ההגדרות המלא שלך
        />
      </div>
    </header>
  );
}

export default Header;
