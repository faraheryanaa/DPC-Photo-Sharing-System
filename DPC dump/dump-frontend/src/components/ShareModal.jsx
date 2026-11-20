function ShareModal({
  post,
  friends,
  selectedFriends,
  onToggleFriend,
  onConfirm,
  onClose
}) {
  if (!post) return null;

  return (
    <div
      className="share-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
      >
        <h2 id="share-title">share this post.</h2>

        <p>
          @{post.username}: {post.caption}
        </p>

        <h3>choose friends to share with</h3>

        <div className="friend-options">
          {friends.map((friend) => (
            <label
              key={friend.id}
              className="friend-option"
            >
              <input
                type="checkbox"
                checked={selectedFriends.includes(friend.id)}
                onChange={() => onToggleFriend(friend.id)}
              />

              <span>@{friend.name}</span>
            </label>
          ))}
        </div>

        <p className="demo-note">
          Frontend preview only. No notification
          or photo access is granted yet.
        </p>

        <div className="share-actions">
          <button
            type="button"
            className="cancel-share-btn"
            onClick={onClose}
          >
            cancel
          </button>

          <button
            type="button"
            className="confirm-share-btn"
            disabled={selectedFriends.length === 0}
            onClick={onConfirm}
          >
            confirm selection
          </button>
        </div>
      </section>
    </div>
  );
}

export default ShareModal;
