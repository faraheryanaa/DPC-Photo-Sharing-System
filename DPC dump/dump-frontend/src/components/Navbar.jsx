
import { Link } from "react-router-dom";
import { logout } from "../services/authService";

function Navbar({ backToGroups = false, cancel = false }) {
  let rightText = "log out";
  let rightPath = "/login";

  if (backToGroups) {
    rightText = "← my groups";
    rightPath = "/home";
  }

  if (cancel) {
    rightText = "cancel";
    rightPath = "/home";
  }

  function handleLogout() {
    if (rightText === "log out") {
      logout();
    }
  }

  return (
    <header className="home-navbar">
      <Link to="/home" className="home-logo">
        dump?
      </Link>

      <nav className="navbar-actions">
        <Link to="/friends" className="profile-nav-link">
          friends
        </Link>

        <Link to="/profile" className="profile-nav-link">
          my profile
        </Link>

        <Link
          to={rightPath}
          className="logout-link"
          onClick={handleLogout}
        >
          {rightText}
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;
