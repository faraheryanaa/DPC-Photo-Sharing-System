
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { useGroups } from "../context/GroupsContext";
import { getGroupPhotos } from "../services/groupService";

import {
  getPhotoComments,
  addPhotoComment,
  editPhotoComment,
  deletePhotoComment,
  sharePhoto,
  updatePhotoCaption,
  deletePhoto
} from "../services/photoService";

import Navbar from "../components/Navbar";
import ShareModal from "../components/ShareModal";
import PhotoCard from "../components/PhotoCard";
import SearchFilters from "../components/SearchFilters";

const API_BASE_URL =
  import.meta.env.VITE_API_ORIGIN || window.location.origin;

function getImageUrl(imageUrl) {
  if (!imageUrl) return "";

  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl}`;
}

// Convert timestamps into Malaysian calendar dates
function getLocalDate(isoTimestamp) {
  if (!isoTimestamp) return "";

  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function GroupPage() {
  const {
    myGroups: groups,
    friends,
    currentUser
  } = useGroups();

  const { groupId } = useParams();

  const group = groups.find(
    (item) => String(item.id) === String(groupId)
  );

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filtering states
  const [search, setSearch] = useState("");
  const [uploader, setUploader] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  // Comment states
  const [comments, setComments] = useState({});
  const [inputs, setInputs] = useState({});

  // Sharing states
  const [sharingPost, setSharingPost] = useState(null);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [shareMessage, setShareMessage] = useState("");

  // Convert backend comment data into frontend format
  function formatComments(data) {
    const memberNames = Object.fromEntries(
      (group?.members || []).map((member) => [
        member.id,
        member.username || member.name
      ])
    );

    if (currentUser) {
      memberNames[currentUser.id] = currentUser.username;
    }

    return data.map((comment) => ({
      id: comment.id,
      user_id: comment.user_id,
      content: comment.content,
      username:
        memberNames[comment.user_id] ||
        `user ${comment.user_id}`
    }));
  }

  // Load photos and comments from backend
  useEffect(() => {
    let cancelled = false;

    async function loadPhotos() {
      try {
        setLoading(true);
        setError("");

        const photoData = await getGroupPhotos(groupId);

        const memberNames = Object.fromEntries(
          (group?.members || []).map((member) => [
            member.id,
            member.username || member.name
          ])
        );

        if (currentUser) {
          memberNames[currentUser.id] = currentUser.username;
        }

        const formattedPosts = photoData.map((photo) => ({
          id: photo.id,
          userId: photo.user_id,
          groupId: photo.group_id,
          imageUrl: getImageUrl(photo.image_url),
          caption: photo.caption || "",
          createdAt: photo.uploaded_at,
          username:
            memberNames[photo.user_id] ||
            `user ${photo.user_id}`
        }));

        const commentResults = await Promise.all(
          formattedPosts.map(async (post) => {
            try {
              const data = await getPhotoComments(post.id);
              return [post.id, formatComments(data)];
            } catch (err) {
              console.error(
                `Could not load comments for photo ${post.id}:`,
                err
              );

              return [post.id, []];
            }
          })
        );

        if (cancelled) return;

        const commentMap = {};

        commentResults.forEach(([photoId, data]) => {
          commentMap[photoId] = data;
        });

        setComments(commentMap);
        setPosts(formattedPosts);

      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load group photos.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (group) {
      loadPhotos();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [groupId, group?.id, currentUser?.id]);

  // Filter photos
  const uploaders = [
    ...new Set(posts.map((post) => post.username))
  ];

  const filteredPosts = posts.filter((post) => {
    const query = search.toLowerCase().trim();

    const matchesSearch =
      (post.caption || "").toLowerCase().includes(query) ||
      (post.username || "").toLowerCase().includes(query);

    const matchesUploader =
      uploader === "all" || post.username === uploader;

    const matchesDate =
      !selectedDate ||
      getLocalDate(post.createdAt) === selectedDate;

    return matchesSearch && matchesUploader && matchesDate;
  });

  // Add a comment through backend
  async function addComment(postId) {
    const content = (inputs[postId] || "").trim();

    if (!content) return;

    try {
      await addPhotoComment(postId, content);

      const updatedComments = await getPhotoComments(postId);

      setComments((previous) => ({
        ...previous,
        [postId]: formatComments(updatedComments)
      }));

      setInputs((previous) => ({
        ...previous,
        [postId]: ""
      }));

      setError("");

    } catch (err) {
      setError(err.message || "Could not add comment.");
    }
  }

  // Edit an existing comment
  async function handleEditComment(postId, comment) {
    const newContent = window.prompt(
      "Edit your comment:",
      comment.content
    );

    if (newContent === null) return;

    if (!newContent.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    try {
      await editPhotoComment(
        comment.id,
        newContent.trim()
      );

      const updatedComments = await getPhotoComments(postId);

      setComments((previous) => ({
        ...previous,
        [postId]: formatComments(updatedComments)
      }));

      setError("");

    } catch (err) {
      setError(err.message || "Could not edit comment.");
    }
  }

  // Delete an existing comment
  async function handleDeleteComment(postId, commentId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );

    if (!confirmed) return;

    try {
      await deletePhotoComment(commentId);

      const updatedComments = await getPhotoComments(postId);

      setComments((previous) => ({
        ...previous,
        [postId]: formatComments(updatedComments)
      }));

      setError("");

    } catch (err) {
      setError(err.message || "Could not delete comment.");
    }
  }

  // Edit photo caption
  async function handleEditPhoto(post) {
    const newCaption = window.prompt(
      "Edit your photo caption:",
      post.caption || ""
    );

    if (newCaption === null) return;

    try {
      await updatePhotoCaption(
        post.id,
        newCaption.trim()
      );

      setPosts((previous) =>
        previous.map((photo) =>
          photo.id === post.id
            ? { ...photo, caption: newCaption.trim() }
            : photo
        )
      );

      setError("");

    } catch (err) {
      setError(err.message || "Could not update photo caption.");
    }
  }

  // Delete photo
  async function handleDeletePhoto(post) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this photo? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await deletePhoto(post.id);

      setPosts((previous) =>
        previous.filter((photo) => photo.id !== post.id)
      );

      setComments((previous) => {
        const updated = { ...previous };
        delete updated[post.id];
        return updated;
      });

      setError("");

    } catch (err) {
      setError(err.message || "Could not delete photo.");
    }
  }

  // Open sharing popup
  function openShare(post) {
    setSharingPost(post);
    setSelectedFriends([]);
    setShareMessage("");
  }

  // Select or deselect a friend
  function toggleFriend(friendId) {
    setSelectedFriends((previous) =>
      previous.includes(friendId)
        ? previous.filter((id) => id !== friendId)
        : [...previous, friendId]
    );
  }

  // Share photo through backend
  async function confirmShare() {
    if (!sharingPost || selectedFriends.length === 0) return;

    try {
      const result = await sharePhoto(
        sharingPost.id,
        selectedFriends
      );

      const count = result.shared_to?.length || 0;
      const alreadyCount = result.already_shared?.length || 0;

      setShareMessage(
        count > 0
          ? `Photo successfully shared with ${count} friend(s).`
          : "This photo was already shared with the selected friend(s)."
      );

      if (alreadyCount > 0 && count > 0) {
        setShareMessage(
          `Photo shared with ${count} friend(s). ${alreadyCount} already had access.`
        );
      }

      setSharingPost(null);
      setSelectedFriends([]);

    } catch (err) {
      setShareMessage(err.message || "Photo sharing failed.");
    }
  }

  // Handle invalid group IDs
  if (!group) {
    return (
      <main className="group-page">
        <h1>group not found.</h1>
        <Link to="/home">back to my groups</Link>
      </main>
    );
  }

  // Convert actual friends to ShareModal format
  const shareableFriends = friends.map((friend) => ({
    id: friend.id,
    name: friend.username
  }));

  return (
    <div className="home-page">
      <Navbar backToGroups />

      <main className="group-page">
        <Link to="/home" className="back-link">
          ← back to groups
        </Link>

        <h1>{group.name}</h1>

        {group.description && (
          <p className="home-description">
            {group.description}
          </p>
        )}

        <Link to="/upload" className="group-upload-link">
          + post image
        </Link>

        <SearchFilters
          search={search}
          uploader={uploader}
          selectedDate={selectedDate}
          uploaders={uploaders}
          onSearchChange={setSearch}
          onUploaderChange={setUploader}
          onDateChange={setSelectedDate}
          onClear={() => {
            setSearch("");
            setUploader("all");
            setSelectedDate("");
          }}
        />

        <p className="result-count">
          {filteredPosts.length} photo(s) found
        </p>

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        {shareMessage && (
          <div className="share-notice" role="status">
            {shareMessage}
          </div>
        )}

        {loading && (
          <p className="empty-message">
            loading photos...
          </p>
        )}

        {!loading && filteredPosts.length === 0 && (
          <p className="empty-message">
            no matching photos found.
          </p>
        )}

        <div className="post-grid">
          {filteredPosts.map((post) => (
            <PhotoCard
              key={post.id}
              post={post}
              comments={comments[post.id] || []}
              commentInput={inputs[post.id] || ""}
              onCommentChange={(postId, value) =>
                setInputs((previous) => ({
                  ...previous,
                  [postId]: value
                }))
              }
              onAddComment={addComment}
              onShare={openShare}
              currentUserId={currentUser?.id}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onEditPhoto={handleEditPhoto}
              onDeletePhoto={handleDeletePhoto}
            />
          ))}
        </div>
      </main>

      <ShareModal
        post={sharingPost}
        friends={shareableFriends}
        selectedFriends={selectedFriends}
        onToggleFriend={toggleFriend}
        onConfirm={confirmShare}
        onClose={() => setSharingPost(null)}
      />
    </div>
  );
}

export default GroupPage;
