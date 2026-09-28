import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar.jsx";
import BoardFormModal from "../components/BoardFormModal.jsx";
import { PlusIcon } from "../components/Icons.jsx";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api
      .listBoards()
      .then((data) => setBoards(data.boards))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  async function createBoard(values) {
    const { board } = await api.createBoard(values);
    navigate(`/boards/${board.id}`);
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page">
        <div className="page-header">
          <div>
            <h1>
              {greeting()}, {user.name.split(" ")[0]}
            </h1>
            <p className="subtitle">
              {boards === null
                ? "Loading your boards..."
                : `You're on ${boards.length} board${boards.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <PlusIcon /> New board
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {boards === null ? (
          <div className="center-screen">
            <div className="spinner" />
          </div>
        ) : (
          <div className="board-grid">
            {boards.map((board) => (
              <button
                key={board.id}
                className="board-card"
                style={{ "--board-color": board.color }}
                onClick={() => navigate(`/boards/${board.id}`)}
              >
                <div className="board-card-banner" />
                <div className="board-card-body">
                  <div className="board-card-title">
                    <h3>{board.name}</h3>
                    {board.owner_id === user.id && <span className="badge">Owner</span>}
                  </div>
                  <p>{board.description || "No description yet."}</p>
                  <div className="board-card-meta">
                    <div className="avatar-stack">
                      {board.members.slice(0, 5).map((m) => (
                        <Avatar key={m.id} user={m} size={26} />
                      ))}
                    </div>
                    <span>
                      {board.task_count} task{board.task_count === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            <button className="board-card board-card-new" onClick={() => setCreating(true)}>
              <PlusIcon size={28} />
              <span>{boards.length ? "Create board" : "Create your first board"}</span>
            </button>
          </div>
        )}
      </main>

      {creating && <BoardFormModal onClose={() => setCreating(false)} onSubmit={createBoard} />}
    </div>
  );
}
