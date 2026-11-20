
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { useGroups } from "../context/GroupsContext";
import {
  getSharedPhotos,
  getPhotoComments,
  addPhotoComment,
  editPhotoComment,
  deletePhotoComment
} from "../services/photoService";

import Navbar from "../components/Navbar";
import GroupCard from "../components/GroupCard";

const API_BASE_URL =
  import.meta.env.VITE_API_ORIGIN || window.location.origin;

function getImageUrl(imageUrl) {
  if (!imageUrl) return "";

  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl}`;
}

function Home() {
  const {
    myGroups: groups,
    friends,
    currentUser
  } = useGroups();

  const [search, setSearch] = useState("");
  const [sharedPhotos, setSharedPhotos] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(true);
  const [sharedError, setSharedError] = useState("");

  // Shared photo comments
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  // Format comments received from backend
  function formatComments(data) {
    const usernames = Object.fromEntries(
      friends.map((friend) => [
        friend.id,
        friend.username
      ])
    );

    if (currentUser) {
      usernames[currentUser.id] = currentUser.username;
    }

    return data.map((comment) => ({
      id: comment.id,
      user_id: comment.user_id,
      username:
        comment.username ||
        usernames[comment.user_id] ||
        `user ${comment.user_id}`,
      content: comment.content
    }));
  }

  // Load shared photos and their comments
  useEffect(() => {
    let cancelled = false;

    async function loadSharedPhotos() {
      try {
        setSharedLoading(true);
        setSharedError("");

        const data = await getSharedPhotos();

        const friendNames = Object.fromEntries(
          friends.map((friend) => [
            friend.id,
            friend.username
          ])
        );

        const formattedPhotos = data.map((photo) => ({
          id: photo.id,
          userId: photo.user_id,
          imageUrl: getImageUrl(photo.image_url),
          caption: photo.caption || "",
          uploadedAt: photo.uploaded_at,
          sharedAt: photo.shared_at,
          username:
            friendNames[photo.user_id] ||
            `user ${photo.user_id}`
        }));

        // Load comments for every shared photo
        const commentResults = await Promise.all(
          formattedPhotos.map(async (photo) => {
            try {
              const data = await getPhotoComments(photo.id);

              return [
                photo.id,
                formatComments(data)
              ];
            } catch (err) {
              console.error(
                `Could not load comments for photo ${photo.id}:`,
                err
              );

              return [photo.id, []];
            }
          })
        );

        if (cancelled) return;

        const commentMap = {};

        commentResults.forEach(([photoId, data]) => {
          commentMap[photoId] = data;
        });

        setSharedPhotos(formattedPhotos);
        setComments(commentMap);

      } catch (err) {
        if (!cancelled) {
          setSharedError(
            err.message || "Could not load shared photos."
          );
        }
      } finally {
        if (!cancelled) {
          setSharedLoading(false);
        }
      }
    }

    loadSharedPhotos();

    return () => {
      cancelled = true;
    };
  }, [friends, currentUser?.id]);

  // Add comment to a shared photo
  async function handleAddComment(photoId) {
    const content = (commentInputs[photoId] || "").trim();

    if (!content) return;

    try {
      await addPhotoComment(photoId, content);

      const updatedComments = await getPhotoComments(photoId);

      setComments((previous) => ({
        ...previous,
        [photoId]: formatComments(updatedComments)
      }));

      setCommentInputs((previous) => ({
        ...previous,
        [photoId]: ""
      }));

      setSharedError("");

    } catch (err) {
      setSharedError(
        err.message || "Could not add comment."
      );
    }
  }

  // Edit your own comment
  async function handleEditComment(photoId, comment) {
    const newContent = window.prompt(
      "Edit your comment:",
      comment.content
    );

    if (newContent === null) return;

    if (!newContent.trim()) {
      setSharedError("Comment cannot be empty.");
      return;
    }

    try {
      await editPhotoComment(
        comment.id,
        newContent.trim()
      );

      const updatedComments = await getPhotoComments(photoId);

      setComments((previous) => ({
        ...previous,
        [photoId]: formatComments(updatedComments)
      }));

      setSharedError("");

    } catch (err) {
      setSharedError(
        err.message || "Could not edit comment."
      );
    }
  }

  // Delete your own comment
  async function handleDeleteComment(photoId, commentId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );

    if (!confirmed) return;

    try {
      await deletePhotoComment(commentId);

      const updatedComments = await getPhotoComments(photoId);

      setComments((previous) => ({
        ...previous,
        [photoId]: formatComments(updatedComments)
      }));

      setSharedError("");

    } catch (err) {
      setSharedError(
        err.message || "Could not delete comment."
      );
    }
  }

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="home-page">
      <Navbar />

      <main className="home-main">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>

          <input
            className="search-input"
            type="search"
            placeholder="search your groups / friends here..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {/* My Groups */}
        <h1>my groups</h1>

        <p className="home-description">
          your favourite people, all in one place.
        </p>

        <div className="group-grid">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
            />
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <p className="empty-message">
            no groups found. try another search!
          </p>
        )}

        <Link
          to="/manage-groups"
          className="manage-groups-link"
        >
          + create / manage groups
        </Link>

        <Link
          to="/upload"
          className="post-image-btn"
        >
          + post image
        </Link>

        {/* Shared with Me */}
        <section className="shared-section">
          <h1>shared with me.</h1>

          <p className="home-description">
            little moments your friends shared with you.
          </p>

          {sharedLoading && (
            <p>loading shared photos...</p>
          )}

          {sharedError && (
            <p className="error-text">
              {sharedError}
            </p>
          )}

          {!sharedLoading &&
            !sharedError &&
            sharedPhotos.length === 0 && (
              <p className="empty-message">
                no photos have been shared with you yet.
              </p>
            )}

          <div className="post-grid">
            {sharedPhotos.map((photo) => (
              <article
                className="photo-card"
                key={`${photo.id}-${photo.sharedAt}`}
              >
                <div className="photo-preview">
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption || "Shared photo"}
                    className="group-post-image"
                  />
                </div>

                <div className="photo-info">
                  <strong>
                    @{photo.username}
                  </strong>

                  <p className="photo-upload-date">
                    Shared with you:{" "}
                    {photo.sharedAt
                      ? new Date(photo.sharedAt).toLocaleDateString(
                          "en-MY",
                          { timeZone: "Asia/Kuala_Lumpur" }
                        )
                      : "Date unavailable"}
                  </p>

                  <p>{photo.caption}</p>

                  {/* Comments */}
                  <section className="comments-section">
                    <h3>comments</h3>

                    {(comments[photo.id] || []).length === 0 && (
                      <p className="empty-message">
                        no comments yet. be the first to comment!
                      </p>
                    )}

                    {(comments[photo.id] || []).map((comment) => (
                      <div
                        className="shared-comment"
                        key={comment.id}
                      >
                        <p className="photo-comment">
                          <strong>@{comment.username}:</strong>{" "}
                          {comment.content}
                        </p>

                        {Number(comment.user_id) ===
                          Number(currentUser?.id) && (
                          <div className="comment-actions">
                            <button
                              type="button"
                              onClick={() =>
                                handleEditComment(photo.id, comment)
                              }
                            >
                              edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteComment(
                                  photo.id,
                                  comment.id
                                )
                              }
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
                        handleAddComment(photo.id);
                      }}
                    >
                      <input
                        type="text"
                        placeholder="leave a comment..."
                        aria-label="Write a comment"
                        value={commentInputs[photo.id] || ""}
                        onChange={(event) =>
                          setCommentInputs((previous) => ({
                            ...previous,
                            [photo.id]: event.target.value
                          }))
                        }
                      />

                      <button type="submit">
                        post
                      </button>
                    </form>
                  </section>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
