
import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Home from "./Pages/Home";
import GroupPage from "./Pages/GroupPage";
import Upload from "./Pages/Upload";
import Profile from "./Pages/Profile";
import ManageGroups from "./Pages/ManageGroups";
import Friends from "./Pages/Friends";

import { GroupsProvider } from "./context/GroupsContext";

import "./App.css";

function App() {
  const [uploadedPosts, setUploadedPosts] = useState({});
  const photoUrls = useRef([]);

  // Release temporary photo URLs when the app unmounts.
  useEffect(() => {
    return () => {
      photoUrls.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Temporary upload handler.
  function addPost(groupId, file, caption) {
    const imageUrl = URL.createObjectURL(file);
    photoUrls.current.push(imageUrl);

    const newPost = {
      id: crypto.randomUUID(),
      username: "me",
      caption,
      imageUrl,
      createdAt: new Date().toISOString(),
      comments: []
    };

    setUploadedPosts((previous) => ({
      ...previous,
      [groupId]: [
        newPost,
        ...(previous[groupId] || [])
      ]
    }));
  }

  return (
    <GroupsProvider>
      <BrowserRouter>
        <Routes>
          {/* Default route */}
          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Main pages */}
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/manage-groups"
            element={<ManageGroups />}
          />
          <Route path="/friends" element={<Friends />} />

          {/* Photo upload */}
          <Route
            path="/upload"
            element={<Upload addPost={addPost} />}
          />

          {/* Individual group page */}
          <Route
            path="/groups/:groupId"
            element={<GroupPage uploadedPosts={uploadedPosts} />}
          />

          {/* Unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </BrowserRouter>
    </GroupsProvider>
  );
}

export default App;
