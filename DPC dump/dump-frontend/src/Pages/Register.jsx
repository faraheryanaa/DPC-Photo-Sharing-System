
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
      setError("Username must contain at least 3 characters.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await register(cleanUsername, password);

      alert("Account created successfully! Please log in.");
      navigate("/login");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-container">
        <div className="auth-logo">dump?</div>

        <h1>create an account.</h1>
        <p className="auth-subtitle">
          start sharing moments with your friends.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="register-username">create username</label>
          <input
            id="register-username"
            type="text"
            placeholder="choose a username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="register-password">create password</label>
          <input
            id="register-password"
            type="password"
            placeholder="at least 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label htmlFor="confirm-password">confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="repeat your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && <p className="error-text">{error}</p>}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "creating account..." : "register"}
          </button>
        </form>

        <p className="auth-switch">
          already have an account?{" "}
          <Link to="/login">log in</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
