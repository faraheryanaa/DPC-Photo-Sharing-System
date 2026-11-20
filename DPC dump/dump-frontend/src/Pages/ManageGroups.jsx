
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import { useGroups } from "../context/GroupsContext";
import { apiRequest } from "../services/api";

function ManageGroups() {
  const navigate = useNavigate();

  const {
    myGroups,
    friends,
    currentUser,
    loading,
    error: contextError,
    createGroup,
    renameGroup,
    addMember,
    removeMember,
    leaveGroup
  } = useGroups();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleMember(memberId) {
    setSelectedMembers((previous) =>
      previous.includes(memberId)
        ? previous.filter((id) => id !== memberId)
        : [...previous, memberId]
    );
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 3) {
      setError("Group name must have at least 3 characters.");
      return;
    }

    try {
      setSaving(true);

      const groupId = await createGroup(
        name,
        description,
        selectedMembers
      );

      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.message || "Could not create group.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(groupId) {
    if (editName.trim().length < 3) {
      setError("Group name must have at least 3 characters.");
      return;
    }

    try {
      setError("");
      await renameGroup(groupId, editName);
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Could not rename group.");
    }
  }

  async function handleAddMember(groupId, memberId) {
    try {
      setError("");
      await addMember(groupId, memberId);
    } catch (err) {
      setError(err.message || "Could not add member.");
    }
  }

  async function handleRemoveMember(groupId, memberId) {
    if (!window.confirm("Remove this member from the group?")) {
      return;
    }

    try {
      setError("");
      await removeMember(groupId, memberId);
    } catch (err) {
      setError(err.message || "Could not remove member.");
    }
  }

  async function handleLeaveGroup(group) {
    if (!window.confirm(`Leave ${group.name}?`)) {
      return;
    }

    try {
      setError("");
      await leaveGroup(group.id);
    } catch (err) {
      setError(err.message || "Could not leave group.");
    }
  }

  async function handleDeleteGroup(group) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${group.name}"?\n\n` +
      "All photos, comments, and shares belonging to this group will also be deleted. This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setError("");
      await apiRequest(`/groups/${group.id}`, {
        method: "DELETE"
      });

      // Reload so GroupsContext fetches the updated group list.
      window.location.reload();
    } catch (err) {
      setError(err.message || "Could not delete group.");
    }
  }

  return (
    <div className="home-page">
      <Navbar backToGroups />

      <main className="manage-page">
        <Link to="/home" className="back-link">
          ← back to my groups
        </Link>

        <h1>manage groups.</h1>
        <p className="home-description">
          create a space for your favourite people.
        </p>

        {error && <p className="error-text">{error}</p>}
        {contextError && (
          <p className="error-text">{contextError}</p>
        )}

        <section className="manage-card">
          <h2>create a new group</h2>

          <form onSubmit={handleCreate} className="manage-form">
            <label htmlFor="new-group-name">group name</label>

            <input
              id="new-group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. weekend crew"
              maxLength={50}
              required
            />

            <label htmlFor="group-description">
              description (optional)
            </label>

            <textarea
              id="group-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              maxLength={200}
              rows={3}
              placeholder="what's this group about?"
            />

            <h3>add friends</h3>

            <div className="manage-members">
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <label
                    key={friend.id}
                    className="member-choice"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(friend.id)}
                      onChange={() => toggleMember(friend.id)}
                    />
                    @{friend.username}
                  </label>
                ))
              ) : (
                <p>
                  No accepted friends available yet. Add friends
                  before inviting them to a group.
                </p>
              )}
            </div>

            <button
              className="manage-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "creating..." : "+ create group"}
            </button>
          </form>
        </section>

        <section className="manage-card">
          <h2>your groups</h2>

          {loading && <p>loading your groups...</p>}

          {!loading && myGroups.length === 0 && (
            <p>you haven't joined any groups yet.</p>
          )}

          {myGroups.map((group) => {
            const isOwner =
              Number(group.ownerId) === Number(currentUser?.id);

            return (
              <div className="manage-group" key={group.id}>
                <div className="manage-group-heading">
                  <div>
                    <h3>{group.icon} {group.name}</h3>
                    {group.description && <p>{group.description}</p>}
                  </div>

                  <Link to={`/groups/${group.id}`}>
                    view group
                  </Link>
                </div>

                <p className="manage-members-title">
                  members ({group.members.length})
                </p>

                <div className="member-list">
                  {group.members.map((member) => (
                    <div className="member-row" key={member.id}>
                      <span>
                        @{member.username || member.name || `user ${member.id}`}
                        {Number(member.id) === Number(group.ownerId)
                          ? " (owner)"
                          : ""}
                      </span>

                      {isOwner &&
                        Number(member.id) !== Number(currentUser?.id) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveMember(group.id, member.id)
                            }
                          >
                            remove
                          </button>
                        )}
                    </div>
                  ))}
                </div>

                {isOwner ? (
                  <>
                    {editingId === group.id ? (
                      <div className="rename-form">
                        <input
                          aria-label="New group name"
                          value={editName}
                          onChange={(event) =>
                            setEditName(event.target.value)
                          }
                        />

                        <button
                          type="button"
                          onClick={() => handleRename(group.id)}
                        >
                          save
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setError("");
                          }}
                        >
                          cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="manage-secondary"
                        onClick={() => {
                          setEditingId(group.id);
                          setEditName(group.name);
                          setError("");
                        }}
                      >
                        rename group
                      </button>
                    )}

                    <button
                      type="button"
                      className="manage-delete-btn"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      delete group
                    </button>

                    <h4>add another friend</h4>

                    {friends
                      .filter(
                        (friend) =>
                          !group.members.some(
                            (member) =>
                              Number(member.id) === Number(friend.id)
                          )
                      )
                      .map((friend) => (
                        <button
                          key={friend.id}
                          type="button"
                          className="manage-secondary"
                          onClick={() =>
                            handleAddMember(group.id, friend.id)
                          }
                        >
                          + @{friend.username}
                        </button>
                      ))}
                  </>
                ) : (
                  <button
                    type="button"
                    className="leave-group-btn"
                    onClick={() => handleLeaveGroup(group)}
                  >
                    leave group
                  </button>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

export default ManageGroups;
