import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function Home() {
  const { user, logout } = useAuth();
  return (
    <div className="center-screen">
      <div>
        <h1>Hi {user.name}!</h1>
        <button className="btn btn-ghost" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
