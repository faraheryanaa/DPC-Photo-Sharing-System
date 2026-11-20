
function CommentSection({
  postId,
  comments,
  commentInput,
  onCommentChange,
  onAddComment,
  currentUserId,
  onEditComment,
  onDeleteComment
}) {
  return (
    <section className="comments-section">
      <h3>comments</h3>

      {comments.map((comment) => (
        <div className="photo-comment" key={comment.id}>
          <p>
            <strong>@{comment.username}</strong>: {comment.content}
          </p>

          {Number(comment.user_id) === Number(currentUserId) && (
            <div className="comment-actions">
              <button
                type="button"
                onClick={() => onEditComment(postId, comment)}
              >
                edit
              </button>

              <button
                type="button"
                onClick={() => onDeleteComment(postId, comment.id)}
              >
                delete
              </button>
            </div>
          )}
        </div>
      ))}

      <form
        className="comment-form"
        onSubmit={(event) => {
          event.preventDefault();
          onAddComment(postId);
        }}
      >
        <input
          type="text"
          placeholder="leave a comment..."
          aria-label="Write a comment"
          value={commentInput}
          onChange={(event) =>
            onCommentChange(postId, event.target.value)
          }
        />

        <button type="submit">post</button>
      </form>
    </section>
  );
}

export default CommentSection;
