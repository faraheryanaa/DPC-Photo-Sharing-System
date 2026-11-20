
import { apiRequest } from "./api";

// Retrieve accepted friends
export async function getFriends() {
  return apiRequest("/friends");
}

// Retrieve incoming friend requests
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

// Remove an existing friend
export async function removeFriend(userId) {
  return apiRequest(`/friends/${userId}`, {
    method: "DELETE"
  });
}
