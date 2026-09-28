import { useCallback, useEffect, useReducer, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AddColumn from "../components/AddColumn.jsx";
import Avatar from "../components/Avatar.jsx";
import BoardFormModal from "../components/BoardFormModal.jsx";
import Column from "../components/Column.jsx";
import { ArrowLeftIcon, EditIcon, TrashIcon } from "../components/Icons.jsx";
import Navbar from "../components/Navbar.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { boardReducer, columnTasks } from "../lib/boardState.js";
import { COLUMN_ACCENTS } from "../lib/constants.js";
import "../styles/board.css";
import "../styles/task.css";

const DONE_RE = /^(done|complete|completed)$/i;

export default function BoardPage() {
  const boardId = Number(useParams().boardId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [board, dispatch] = useReducer(boardReducer, null);
  const [error, setError] = useState("");
  const [editingBoard, setEditingBoard] = useState(false);
  // { columnId } when creating a task, { taskId } when editing one
  const [taskModal, setTaskModal] = useState(null);

  const load = useCallback(() => {
    api
      .getBoard(boardId)
      .then((data) => dispatch({ type: "load", board: data.board }))
      .catch((err) => setError(err.message));
  }, [boardId]);

  useEffect(load, [load]);

  // Run an API call, surfacing errors in the banner.
  const run = useCallback(async (fn) => {
    try {
      setError("");
      return await fn();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  if (!board) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="center-screen">
          {error ? (
            <div className="empty-state">
              <h2>Can't open this board</h2>
              <p>{error}</p>
              <Link to="/" className="btn btn-primary">
                Back to boards
              </Link>
            </div>
          ) : (
            <div className="spinner" />
          )}
        </div>
      </div>
    );
  }

  const isOwner = board.owner_id === user.id;

  const addColumn = (name) =>
    run(async () => {
      const { column } = await api.createColumn(board.id, name);
      dispatch({ type: "column:upsert", column });
    });

  const renameColumn = (column, name) =>
    run(async () => {
      dispatch({ type: "column:upsert", column: { ...column, name } });
      const data = await api.renameColumn(column.id, name);
      dispatch({ type: "column:upsert", column: data.column });
    });

  const deleteColumn = (column) => {
    const count = columnTasks(board, column.id).length;
    const msg = count
      ? `Delete "${column.name}" and its ${count} task${count === 1 ? "" : "s"}?`
      : `Delete "${column.name}"?`;
    if (!window.confirm(msg)) return;
    run(async () => {
      await api.deleteColumn(column.id);
      dispatch({ type: "column:remove", columnId: column.id });
    });
  };

  const saveTask = async ({ column_id, ...fields }) => {
    const current = taskModal.taskId ? board.tasks[taskModal.taskId] : null;
    if (!current) {
      const { task } = await api.createTask(column_id, fields);
      dispatch({ type: "task:upsert", task });
      return;
    }

    const { task } = await api.updateTask(current.id, fields);
    dispatch({ type: "task:upsert", task });
    if (column_id !== current.column_id) {
      // Changing status from the modal moves the task to the end of that column.
      const index = columnTasks(board, column_id).length;
      dispatch({ type: "task:move", taskId: task.id, columnId: column_id, index });
      const data = await api.moveTask(task.id, column_id, index);
      dispatch({ type: "tasks:reorder", tasks: data.tasks });
    }
  };

  const deleteTask = async (task) => {
    await api.deleteTask(task.id);
    dispatch({ type: "task:remove", taskId: task.id });
  };

  const updateBoard = async (values) => {
    const data = await api.updateBoard(board.id, values);
    dispatch({ type: "board:update", board: data.board });
  };

  const deleteBoard = () => {
    if (!window.confirm(`Delete the board "${board.name}" and all of its tasks? This cannot be undone.`)) return;
    run(async () => {
      await api.deleteBoard(board.id);
      navigate("/");
    });
  };

  return (
    <div className="app-shell board-shell">
      <Navbar />

      <div className="board-header" style={{ "--board-color": board.color }}>
        <div className="board-header-main">
          <Link to="/" className="icon-btn board-back" aria-label="Back to boards">
            <ArrowLeftIcon />
          </Link>
          <div className="board-heading">
            <h1>{board.name}</h1>
            {board.description && <p>{board.description}</p>}
          </div>
        </div>
        <div className="board-header-actions">
          <div className="avatar-stack">
            {board.members.slice(0, 6).map((m) => (
              <Avatar key={m.id} user={m} size={30} />
            ))}
          </div>
          <button className="icon-btn on-color" onClick={() => setEditingBoard(true)} title="Board settings">
            <EditIcon />
          </button>
          {isOwner && (
            <button className="icon-btn on-color" onClick={deleteBoard} title="Delete board">
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="board-error">
          <p className="form-error">{error}</p>
        </div>
      )}

      <div className="board-columns">
        {board.columns.map((column, index) => (
          <Column
            key={column.id}
            column={column}
            accent={COLUMN_ACCENTS[index % COLUMN_ACCENTS.length]}
            tasks={columnTasks(board, column.id)}
            isDone={DONE_RE.test(column.name.trim())}
            onAddTask={(col) => setTaskModal({ columnId: col.id })}
            onOpenTask={(task) => setTaskModal({ taskId: task.id })}
            onRename={renameColumn}
            onDelete={deleteColumn}
          />
        ))}
        <AddColumn onAdd={addColumn} />
      </div>

      {taskModal && (taskModal.columnId || board.tasks[taskModal.taskId]) && (
        <TaskModal
          key={taskModal.taskId ?? `new-${taskModal.columnId}`}
          task={taskModal.taskId ? board.tasks[taskModal.taskId] : null}
          columnId={taskModal.columnId}
          columns={board.columns}
          members={board.members}
          onClose={() => setTaskModal(null)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}

      {editingBoard && (
        <BoardFormModal board={board} onClose={() => setEditingBoard(false)} onSubmit={updateBoard} />
      )}
    </div>
  );
}
