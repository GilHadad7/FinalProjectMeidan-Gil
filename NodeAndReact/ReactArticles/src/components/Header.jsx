import React from "react";
import { useNavigate } from "react-router-dom";
import classes from "../components/Header.module.css";
import logo from "../../src/assets/img/new1.jpg";


function Header() {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.role) {
      navigate(`/${user.role}`);
    } else {
      navigate("/");
    }
  };

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  return (
    <header className={classes.header}>
      <div className={classes.logoSection} onClick={handleLogoClick}>
        <img src={logo} alt="Logo" className={classes.logo} />
        <span className={classes.slogan}>C&H Building Management</span>
      </div>

      <div className={classes.settings} onClick={handleSettingsClick}>
        ⚙️
      </div>
    </header>
  );
}

export default Header;
