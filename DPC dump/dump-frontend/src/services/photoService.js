
import { apiRequest } from "./api";

// Upload a photo to a group
export async function uploadPhoto(groupId, file, caption) {
  const formData = new FormData();

  formData.append("group_id", groupId);
  formData.append("caption", caption || "");
  formData.append("file", file);

  return apiRequest("/photos/", {
    method: "POST",
    body: formData
  });
}

// Get comments for a photo
export async function getPhotoComments(photoId) {
  return apiRequest(`/photos/${photoId}/comments`);
}

// Add a comment
export async function addPhotoComment(photoId, content) {
  return apiRequest(`/photos/${photoId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

// Edit a comment
export async function editPhotoComment(commentId, content) {
  return apiRequest(`/photos/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ content })
  });
}

// Delete a comment
export async function deletePhotoComment(commentId) {
  return apiRequest(`/photos/comments/${commentId}`, {
    method: "DELETE"
  });
}

// Update photo caption
export async function updatePhotoCaption(photoId, caption) {
  return apiRequest(`/photos/${photoId}`, {
    method: "PATCH",
    body: JSON.stringify({ caption })
  });
}

// Delete a photo
export async function deletePhoto(photoId) {
  return apiRequest(`/photos/${photoId}`, {
    method: "DELETE"
  });
}

// Share a photo with selected friends
export async function sharePhoto(photoId, userIds) {
  return apiRequest(`/photos/${photoId}/shares`, {
    method: "POST",
    body: JSON.stringify({ user_ids: userIds })
  });
}

// Get photos shared directly with the current user
export async function getSharedPhotos() {
  return apiRequest("/photos/shared-with-me");
}
