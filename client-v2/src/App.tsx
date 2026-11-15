import { Route, Routes } from "react-router";

import AppLayout from "./layouts/AppLayout";
import PostsPage from "./pages/PostsPage";
import PostDetailsPage from "./pages/PostDetailsPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PostsPage />} />

        <Route path="posts/:postId" element={<PostDetailsPage />} />

        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Route>
    </Routes>
  );
}

export default App;
