import CommentSection from "./CommentSection";

function PhotoCard({
  post,
  comments,
  commentInput,
  onCommentChange,
  onAddComment,
  onShare,
  currentUserId,
  onEditComment,
  onDeleteComment,
  onEditPhoto,
  onDeletePhoto
}) {
  const isPhotoOwner =
    Number(post.userId) === Number(currentUserId);

  return (
    <article className="photo-card">
      <div className="photo-preview">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt={post.caption || "Shared photo"}
            className="group-post-image"
          />
        ) : (
          <span>{post.emoji}</span>
        )}
      </div>

      <div className="photo-info">
        <strong>@{post.username}</strong>

        <p className="photo-upload-date">
          {post.createdAt
            ? new Date(post.createdAt).toLocaleDateString("en-MY", {
                timeZone: "Asia/Kuala_Lumpur",
                day: "numeric",
                month: "long",
                year: "numeric"
              })
            : "Upload date unavailable"}
        </p>

        <p>{post.caption}</p>

        {isPhotoOwner && (
          <div className="photo-owner-actions">
            <button
              type="button"
              onClick={() => onEditPhoto(post)}
            >
              edit photo
            </button>

            <button
              type="button"
              onClick={() => onDeletePhoto(post)}
            >
              delete photo
            </button>
          </div>
        )}

        <button
          type="button"
          className="share-post-btn"
          onClick={() => onShare(post)}
        >
          ♡ share with friends
        </button>

        <CommentSection
          postId={post.id}
          comments={comments}
          commentInput={commentInput}
          onCommentChange={onCommentChange}
          onAddComment={onAddComment}
          currentUserId={currentUserId}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
        />
      </div>
    </article>
  );
}

export default PhotoCard;