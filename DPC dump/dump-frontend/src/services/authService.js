
import { apiRequest } from "./api";

export async function login(username, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (data.access_token) {
    localStorage.setItem("token", data.access_token);
  }

  return data;
}

export async function register(username, password) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export async function updateCurrentUser(profileData) {
  return apiRequest("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(profileData),
  });
}

export function logout() {
  localStorage.removeItem("token");
}
