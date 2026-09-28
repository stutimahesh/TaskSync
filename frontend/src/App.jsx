import { AuthProvider } from "./context/AuthContext.jsx";

export default function App() {
  return (
    <AuthProvider>
      <h1>TaskSync</h1>
    </AuthProvider>
  );
}
