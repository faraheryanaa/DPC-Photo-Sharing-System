import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      await login(username, password);

      // Login successful
      navigate("/home");
    } catch (error) {
      setError(error.message || "Login failed. Please try again.");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-container">
        <div className="auth-logo">dump?</div>

        <h1>welcome back.</h1>

        <p className="auth-subtitle">
          log in to see what your friends have been dumping.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-username">username</label>

          <input
            id="login-username"
            type="text"
            placeholder="your username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="login-password">password</label>

          <div className="password-field">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-button">
            log in
          </button>
        </form>

        <p className="auth-switch">
          don't have an account?{" "}
          <Link to="/register">register here</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;