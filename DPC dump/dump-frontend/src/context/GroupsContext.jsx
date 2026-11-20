
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react";

import { getCurrentUser } from "../services/authService";

import {
  getGroups,
  getGroupDetails,
  getFriends,
  createGroup as createGroupAPI,
  renameGroup as renameGroupAPI,
  addGroupMember as addGroupMemberAPI,
  removeGroupMember as removeGroupMemberAPI,
  leaveGroup as leaveGroupAPI
} from "../services/groupService";

const GroupsContext = createContext(null);

export function GroupsProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatGroup = (group) => ({
    id: group.id,
    name: group.name,
    description: "",
    icon: "💗",
    ownerId: group.created_by,
    members: (group.members || []).map((member) => ({
      id: member.id,
      name: member.username
    })),
    posts: []
  });

  const refreshGroups = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setGroups([]);
      setFriends([]);
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [userData, groupData, friendData] = await Promise.all([
        getCurrentUser(),
        getGroups(),
        getFriends()
      ]);

      const detailedGroups = await Promise.all(
        groupData.map((group) => getGroupDetails(group.id))
      );

      setCurrentUser(userData);
      setGroups(detailedGroups.map(formatGroup));
      setFriends(friendData);
    } catch (err) {
      setError(err.message || "Unable to load your account data.");
      console.error("Data loading error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  async function createGroup(name, description = "", selectedMembers = []) {
    const newGroup = await createGroupAPI(name);

    for (const memberId of selectedMembers) {
      await addGroupMemberAPI(newGroup.id, memberId);
    }

    await refreshGroups();

    return newGroup.id;
  }

  async function renameGroup(groupId, newName) {
    await renameGroupAPI(groupId, newName);
    await refreshGroups();
  }

  async function addMember(groupId, memberId) {
    await addGroupMemberAPI(groupId, memberId);
    await refreshGroups();
  }

  async function removeMember(groupId, memberId) {
    await removeGroupMemberAPI(groupId, memberId);
    await refreshGroups();
  }

  async function leaveGroup(groupId) {
    await leaveGroupAPI(groupId);
    await refreshGroups();
  }

  const myGroups = groups;

  return (
    <GroupsContext.Provider
      value={{
        groups,
        myGroups,
        friends,
        currentUser,
        loading,
        error,
        refreshGroups,
        createGroup,
        renameGroup,
        addMember,
        removeMember,
        leaveGroup
      }}
    >
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupsContext);

  if (!context) {
    throw new Error("useGroups must be used inside GroupsProvider");
  }

  return context;
}
