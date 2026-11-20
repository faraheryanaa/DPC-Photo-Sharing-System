
import { apiRequest } from "./api";

// ==========================================
// GROUPS
// ==========================================

// Get all groups belonging to the logged-in user
export async function getGroups() {
  return apiRequest("/groups");
}

// Get details of a specific group, including members
export async function getGroupDetails(groupId) {
  return apiRequest(`/groups/${groupId}`);
}

// Create a new group
export async function createGroup(name) {
  return apiRequest("/groups", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim()
    })
  });
}

// Update group name
export async function renameGroup(groupId, name) {
  return apiRequest(`/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: name.trim()
    })
  });
}

// Add a friend to a group
export async function addGroupMember(groupId, userId) {
  return apiRequest(`/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({
      user_id: Number(userId)
    })
  });
}

// Remove a member from a group
export async function removeGroupMember(groupId, userId) {
  return apiRequest(`/groups/${groupId}/members/${userId}`, {
    method: "DELETE"
  });
}

// Leave a group
export async function leaveGroup(groupId) {
  return apiRequest(`/groups/${groupId}/members/me`, {
    method: "DELETE"
  });
}

// Get photos belonging to a group
export async function getGroupPhotos(groupId) {
  return apiRequest(`/groups/${groupId}/photos`);
}


// ==========================================
// FRIENDS
// ==========================================

// Get accepted friends
export async function getFriends() {
  return apiRequest("/friends");
}

// Get received friend requests
export async function getFriendRequests() {
  return apiRequest("/friends/requests");
}

// Send a friend request
export async function sendFriendRequest(userId) {
  return apiRequest(`/friends/${userId}/request`, {
    method: "POST"
  });
}

// Accept a friend request
export async function acceptFriendRequest(friendshipId) {
  return apiRequest(`/friends/requests/${friendshipId}/accept`, {
    method: "POST"
  });
}

// Remove a friend
export async function removeFriend(userId) {
  return apiRequest(`/friends/${userId}`, {
    method: "DELETE"
  });
}
