
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend
} from "../services/groupService";

function Friends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadFriends() {
    try {
      setLoading(true);
      setError("");

      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests()
      ]);

      setFriends(friendsData);
      setRequests(requestsData);
    } catch (err) {
      setError(err.message || "Unable to load friends.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFriends();
  }, []);

  async function handleSendRequest(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!userId.trim() || Number(userId) <= 0) {
      setError("Please enter a valid user ID.");
      return;
    }

    try {
      await sendFriendRequest(Number(userId));
      setMessage("Friend request sent successfully!");
      setUserId("");
      await loadFriends();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAccept(requestId) {
    try {
      await acceptFriendRequest(requestId);
      setMessage("Friend request accepted!");
      await loadFriends();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(friendId) {
    if (!window.confirm("Are you sure you want to remove this friend?")) {
      return;
    }

    try {
      await removeFriend(friendId);
      setMessage("Friend removed successfully.");
      await loadFriends();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="home-page">
      <Navbar backToGroups />

      <main className="manage-groups-page">
        <Link to="/home" className="back-link">
          ← back to my groups
        </Link>

        <h1>friends.</h1>
        <p className="home-description">
          connect with your favourite people.
        </p>

        <section className="manage-section">
          <h2>add a friend</h2>

          <form onSubmit={handleSendRequest}>
            <label htmlFor="friend-user-id">user ID</label>

            <input
              id="friend-user-id"
              type="number"
              min="1"
              placeholder="enter your friend's user ID"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />

            <button type="submit">
              + send friend request
            </button>
          </form>
        </section>

        {message && (
          <p className="share-notice" role="status">{message}</p>
        )}

        {error && (
          <p className="error-text" role="alert">{error}</p>
        )}

        {loading ? (
          <p>loading friends...</p>
        ) : (
          <>
            <section className="manage-section">
              <h2>friend requests ({requests.length})</h2>

              {requests.length === 0 ? (
                <p className="empty-message">
                  no pending friend requests.
                </p>
              ) : (
                requests.map((request) => {
                  const requestId = request.id ?? request.friendship_id;
                  const requesterId = request.requester_id;
                  const requesterName =
                    request.requester?.username ||
                    request.requester_username ||
                    request.username ||
                    `User ${requesterId ?? ""}`;

                  return (
                    <div className="friend-row" key={requestId}>
                      <span>@{requesterName}</span>

                      <button
                        type="button"
                        onClick={() => handleAccept(requestId)}
                      >
                        accept
                      </button>
                    </div>
                  );
                })
              )}
            </section>

            <section className="manage-section">
              <h2>my friends ({friends.length})</h2>

              {friends.length === 0 ? (
                <p className="empty-message">
                  you haven't added any friends yet.
                </p>
              ) : (
                friends.map((friend) => (
                  <div className="friend-row" key={friend.id}>
                    <span>
                      @{friend.username}
                      <small> User ID: {friend.id}</small>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemove(friend.id)}
                    >
                      remove
                    </button>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Friends;
