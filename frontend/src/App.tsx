import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { useEffect, useState } from "react";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import Splash from "./pages/Splash";
import UsersList from "./pages/Admin/UsersList";
import UserDetails from "./pages/Admin/UserDetails";
import ProductsList from "./pages/Admin/ProductsList";
import ProductDetails from "./pages/Admin/ProductDetails";

const getToken = () => localStorage.getItem("token");

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getToken();
  if (!token) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

const RequireRole: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return <Navigate to="/" replace />;
    const user = JSON.parse(raw);
    if (!user?.role) return <Navigate to="/" replace />;
    if (!roles.includes(user.role)) return <Navigate to="/" replace />;
    return <>{children}</>;
  } catch {
    return <Navigate to="/" replace />;
  }
};

const RedirectIfAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getToken();
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
};

type Phase = "splash" | "leaving" | "content";

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    // Lock scroll for the entire duration of splash + transition
    document.body.style.overflow = "hidden";

    const t1 = setTimeout(() => setPhase("leaving"), 3000);
    const t2 = setTimeout(() => setContentReady(true), 3032);
    const t3 = setTimeout(() => {
      setPhase("content");
      // Restore scroll once splash is fully gone
      document.body.style.overflow = "";
    }, 3650);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      document.body.style.overflow = "";
    };
  }, []);

  const routes = (
      <Routes>
        <Route path="/signin" element={<RedirectIfAuth><SignIn /></RedirectIfAuth>} />
        <Route path="/signup" element={<RedirectIfAuth><SignUp /></RedirectIfAuth>} />
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Home />} />
          <Route path="admin/users" element={
            <RequireAuth>
              <RequireRole roles={["ADMIN"]}>
                <UsersList />
              </RequireRole>
            </RequireAuth>
          } />
          <Route path="admin/user/details/:id" element={
            <RequireAuth>
              <RequireRole roles={["ADMIN"]}>
                <UserDetails />
              </RequireRole>
            </RequireAuth>
          } />
          <Route path="admin/user/new" element={
            <RequireAuth>
              <RequireRole roles={["ADMIN"]}>
                <UserDetails />
              </RequireRole>
            </RequireAuth>
          } />
          <Route path="admin/products" element={
            <RequireAuth>
              <RequireRole roles={["ADMIN"]}>
                <ProductsList />
              </RequireRole>
            </RequireAuth>
          } />
          <Route path="admin/product/details/:id" element={
            <RequireAuth>
              <RequireRole roles={["ADMIN"]}>
                <ProductDetails />
              </RequireRole>
            </RequireAuth>
          } />
          <Route path="admin/product/new" element={
            <RequireAuth>
              <RequireRole roles={["ADMIN"]}>
                <ProductDetails />
              </RequireRole>
            </RequireAuth>
          } />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
  );

  return (
    <Router>
      <ScrollToTop />
      <div className="relative min-h-screen">
        {/* Content — mounts invisible, transitions to visible after one paint frame */}
        {phase !== "splash" && (
          <div className={`content-wrapper ${contentReady ? "content-visible" : ""}`}>
            {routes}
          </div>
        )}

        {/* Splash — on top, fades out once "leaving" starts */}
        {phase !== "content" && (
          <div className={`splash-wrapper ${phase === "leaving" ? "splash-leaving" : ""}`}>
            <Splash />
          </div>
        )}
      </div>
    </Router>
  );
}
