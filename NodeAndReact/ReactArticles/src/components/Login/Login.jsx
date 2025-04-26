import React, { useState } from "react";
import axios from "axios";
import classes from "./login.module.css";
import { useNavigate } from "react-router-dom";

function Login() {
  const [userId, setUserId] = useState(""); // כאן זה יהיה email בפועל
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:8801/api/login", {
        email: userId, // אנחנו מחפשים לפי email בטבלת users
        password: password,
      });

      const user = response.data;
      console.log("user from server:", user); // ✅ תדפיס את המשתמש שהתקבל מהשרת
      sessionStorage.setItem("user", JSON.stringify(user));
      setTimeout(() => {
        alert(`Welcome ${user.name} (${user.role})`);
      }, 200);

      // כאן תוכל לעשות redirect לפי role (מנהל, עובד, דייר)
      if (user.role === "manager") navigate("/manager");
      else if (user.role === "worker") navigate("/worker");
      else if (user.role === "tenant") navigate("/tenant");
      else navigate("/");
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError("Invalid credentials");
      } else {
        setError("Server error");
        console.error(err);
      }
    }
  };

  return (
    <div className={classes.container}>
      <div className={classes.topBar}>
        <h1 className={classes.topTitle}>C & H BUILDING MANAGEMENT</h1>
      </div>

      <div className={classes.loginBox}>
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Email"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">SIGN IN</button>
        </form>
        {error && <p className={classes.error}>{error}</p>}
        <p className={classes.forgot}>FORGOT PASSWORD</p>
        <p className={classes.link}>
          DO YOU WANT TO MANAGE YOUR BUILDING THROUGH OUR WEBSITE?{" "}
          <a href="http://localhost:3000/">CLICK HERE</a>
        </p>
        <p className={classes.footer}>
          @C&H BUILDING MANAGEMENT | PRIVACY POLICY
        </p>
      </div>
    </div>
  );
}

export default Login;
