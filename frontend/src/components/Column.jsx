import { useState } from "react";
import { EditIcon, PlusIcon, TrashIcon } from "./Icons.jsx";
import TaskCard from "./TaskCard.jsx";

export default function Column({ column, accent, tasks, onAddTask, onOpenTask, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);

  function submitRename(e) {
    e?.preventDefault();
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== column.name) onRename(column, trimmed);
    else setName(column.name);
  }

  return (
    <section className="column" style={{ "--column-accent": accent }}>
      <header className="column-header">
        <span className="column-dot" />
        {editing ? (
          <form onSubmit={submitRename} className="column-rename">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => e.key === "Escape" && (setName(column.name), setEditing(false))}
              maxLength={80}
              autoFocus
            />
          </form>
        ) : (
          <h3 onDoubleClick={() => setEditing(true)} title="Double-click to rename">
            {column.name}
          </h3>
        )}
        <span className="column-count">{tasks.length}</span>
        <div className="column-actions">
          <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Rename column">
            <EditIcon size={15} />
          </button>
          <button className="icon-btn" onClick={() => onDelete(column)} aria-label="Delete column">
            <TrashIcon size={15} />
          </button>
        </div>
      </header>

      <div className="column-body">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
        ))}
        {tasks.length === 0 && <p className="column-empty">No tasks here yet</p>}
      </div>

      <button className="add-task-btn" onClick={() => onAddTask(column)}>
        <PlusIcon size={16} /> Add task
      </button>
    </section>
  );
}
