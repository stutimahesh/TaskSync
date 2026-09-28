import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/auth.css";

const PREVIEW = [
  { name: "Todo", color: "var(--sky-light)", cards: ["Design login flow", "Write API docs"] },
  { name: "In Progress", color: "var(--amber)", cards: ["WebSocket sync"] },
  { name: "Done", color: "var(--mint)", cards: ["Database schema", "JWT auth"] },
];

export default function AuthPage() {
  const { user, login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await signup(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-brand">
          <img src="/favicon.svg" alt="" width="40" height="40" />
          <span>TaskSync</span>
        </div>
        <h1>Plan together. Ship together. In real time.</h1>
        <p>
          Boards, columns and tasks that stay in sync across your whole team the moment anything
          changes.
        </p>
        <div className="auth-preview" aria-hidden="true">
          {PREVIEW.map((col) => (
            <div className="preview-col" key={col.name}>
              <div className="preview-col-title">
                <span style={{ background: col.color }} />
                {col.name}
              </div>
              {col.cards.map((card) => (
                <div className="preview-card" key={card}>
                  {card}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="auth-sub">
            {mode === "login" ? "Log in to pick up where you left off." : "It takes less than a minute."}
          </p>

          <div className="auth-tabs" role="tablist">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>
              Log in
            </button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>
              Sign up
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}

          {mode === "signup" && (
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" className="input" value={form.name} onChange={update("name")} placeholder="Ada Lovelace" required autoFocus />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={update("email")} placeholder="you@team.com" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={form.password}
              onChange={update("password")}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              minLength={mode === "signup" ? 6 : undefined}
              required
            />
          </div>

          <button className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </section>
    </div>
  );
}
