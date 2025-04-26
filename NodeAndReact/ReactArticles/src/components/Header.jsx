import React from "react";
import logo from "../assets/img/new1.jpg";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.role) {
      navigate(`/${user.role}`);
    } else {
      navigate("/"); // אם לא מחובר
    }
  };

  return (
    <header>
      <div className="container">
        <div className="header__wrap">
          <div className="logo">
            <div onClick={handleLogoClick} style={{ cursor: "pointer" }}>
              <img src={logo} alt="logo" />
              <span className="slogan"  style={{ color: "brown" }}>C&H Building Mangment</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
