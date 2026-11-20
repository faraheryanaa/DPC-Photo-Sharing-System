
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useGroups } from "../context/GroupsContext";
import {
  getCurrentUser,
  updateCurrentUser
} from "../services/authService";

function Profile() {
  const { myGroups: groups } = useGroups();

  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getCurrentUser();
        setUser(data);
        setUsername(data.username);
      } catch (err) {
        setError(err.message || "Unable to load profile.");
      }
    }

    loadProfile();
  }, []);

  async function handleUpdateProfile(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const usernameChanged = username.trim() !== user.username;
    const passwordChanged = newPassword.trim() !== "";

    if (!usernameChanged && !passwordChanged) {
      setError("Please enter a new username or password.");
      return;
    }

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (usernameChanged && username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (passwordChanged && newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    const profileData = {
      current_password: currentPassword,
    };

    if (usernameChanged) {
      profileData.username = username.trim();
    }

    if (passwordChanged) {
      profileData.new_password = newPassword;
    }

    try {
      setLoading(true);

      const updatedUser = await updateCurrentUser(profileData);

      setUser(updatedUser);
      setUsername(updatedUser.username);
      setCurrentPassword("");
      setNewPassword("");

      setSuccess("Your account details have been updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home-page">
      <Navbar backToGroups />

      <main className="profile-page">
        <Link to="/home" className="back-link">
          ← back to my groups
        </Link>

        <div className="profile-card">
          <div className="profile-avatar">
            {user ? user.username.charAt(0).toUpperCase() : "?"}
          </div>

          {error && !user ? (
            <p className="error-text">{error}</p>
          ) : (
            <>
              <h1>@{user ? user.username : "Loading..."}</h1>

              <p className="profile-subtitle">
                your little corner of dump?
              </p>

              <p>
                User ID: {user ? user.id : "Loading..."}
              </p>
            </>
          )}
        </div>

        {user && (
          <section className="profile-edit-section">
            <h2>edit account</h2>
            <p>update your username or password.</p>

            <form
              className="profile-edit-form"
              onSubmit={handleUpdateProfile}
            >
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter a new username"
                minLength={3}
                maxLength={50}
              />

              <label htmlFor="currentPassword">
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
              />

              <label htmlFor="newPassword">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank if you don't want to change it"
                minLength={8}
              />

              <p className="profile-form-hint">
                Leave the new password blank if you only want to change
                your username. New passwords must contain at least
                8 characters.
              </p>

              {error && (
                <p className="error-text">{error}</p>
              )}

              {success && (
                <p className="success-text">{success}</p>
              )}

              <button
                type="submit"
                className="profile-save-button"
                disabled={loading}
              >
                {loading ? "saving..." : "save changes"}
              </button>
            </form>
          </section>
        )}

        <section className="profile-groups">
          <h2>my groups</h2>

          <p>groups you're currently part of.</p>

          <div className="profile-group-list">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="profile-group-item"
              >
                <span>{group.icon || "💗"}</span>
                <strong>{group.name}</strong>
                <span className="profile-group-arrow">→</span>
              </Link>
            ))}
          </div>

          {groups.length === 0 && (
            <p>you haven't joined any groups yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default Profile;
