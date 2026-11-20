
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGroups } from "../context/GroupsContext";
import { uploadPhoto } from "../services/photoService";
import Navbar from "../components/Navbar";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function Upload() {
  const { myGroups: groups, loading } = useGroups();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Create a temporary image preview
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Validate selected image
  function selectFile(selected) {
    setError("");

    if (!selected) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(selected.type)) {
      setFile(null);
      setError("Only JPG, PNG and WebP images are allowed.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setError(
        `Image is ${(selected.size / 1024 / 1024).toFixed(2)} MB. Maximum allowed is 5 MB.`
      );
      return;
    }

    setFile(selected);
  }

  // Handle drag and drop
  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  // Upload photo to backend
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!file || !groupId) {
      setError("Please select a photo and a group.");
      return;
    }

    try {
      setSaving(true);

      await uploadPhoto(
        groupId,
        file,
        caption.trim()
      );

      // Navigate back to the selected group
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.message || "Photo upload failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="home-page">
      <Navbar cancel />

      <main className="upload-page">
        <Link to="/home" className="back-link">
          ← back to my groups
        </Link>

        <h1>post a photo.</h1>

        <p className="home-description">
          a little moment worth sharing.
        </p>

        <form className="upload-form" onSubmit={handleSubmit}>
          <div
            className={`upload-dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {preview ? (
              <img
                src={preview}
                alt="Selected photo preview"
                className="upload-preview"
              />
            ) : (
              <div className="upload-placeholder">
                <span className="upload-icon">📷</span>
                <h2>drop your photo here</h2>
                <p>or browse your files below</p>
              </div>
            )}

            <label className="choose-photo-btn">
              {file ? "change photo" : "choose photo"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  selectFile(event.target.files[0]);
                  event.target.value = "";
                }}
                className="file-input"
              />
            </label>
          </div>

          {file && (
            <p className="selected-file">
              selected: {file.name}
            </p>
          )}

          <label htmlFor="post-caption" className="upload-label">
            caption (optional)
          </label>

          <textarea
            id="post-caption"
            placeholder="what's the story behind this photo?"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={300}
            rows={3}
          />

          <label htmlFor="post-group" className="upload-label">
            share with
          </label>

          <select
            id="post-group"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            required
          >
            <option value="">choose a group...</option>

            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="confirm-post-btn"
            disabled={!file || !groupId || saving || loading}
          >
            {saving ? "uploading..." : "confirm post ✓"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default Upload;
