import { useRef, useState } from "react";
import { EditIcon, PlusIcon, TrashIcon } from "./Icons.jsx";
import TaskCard from "./TaskCard.jsx";

export default function Column({
  column,
  accent,
  tasks,
  isDone,
  draggingId,
  onDragStart,
  onDragEnd,
  onDropTask,
  onAddTask,
  onOpenTask,
  onRename,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  // Index (among the column's other cards) where a dragged card would land.
  const [dropIndex, setDropIndex] = useState(null);
  const bodyRef = useRef(null);

  function submitRename(e) {
    e?.preventDefault();
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== column.name) onRename(column, trimmed);
    else setName(column.name);
  }

  // --- drag and drop ------------------------------------------------------

  function handleDragOver(e) {
    if (draggingId == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const cards = [...bodyRef.current.querySelectorAll("[data-task-id]")].filter(
      (el) => Number(el.dataset.taskId) !== draggingId
    );
    const index = cards.findIndex((el) => {
      const rect = el.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    });
    setDropIndex(index === -1 ? cards.length : index);
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropIndex(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    if (draggingId != null && dropIndex != null) {
      const others = tasks.filter((t) => t.id !== draggingId);
      onDropTask(draggingId, column.id, others[dropIndex]?.id ?? null);
    }
    setDropIndex(null);
  }

  // Render cards with a drop indicator slotted in at dropIndex.
  const items = [];
  let slot = 0;
  for (const task of tasks) {
    const isDragged = task.id === draggingId;
    if (!isDragged && slot === dropIndex) items.push(<div key="drop" className="drop-indicator" />);
    items.push(
      <TaskCard
        key={task.id}
        task={task}
        done={isDone}
        dragging={isDragged}
        onOpen={onOpenTask}
        onDragStart={onDragStart}
        onDragEnd={() => {
          setDropIndex(null);
          onDragEnd();
        }}
      />
    );
    if (!isDragged) slot += 1;
  }
  if (dropIndex != null && dropIndex >= slot) items.push(<div key="drop" className="drop-indicator" />);

  return (
    <section
      className={`column ${dropIndex != null ? "is-drop-target" : ""}`}
      style={{ "--column-accent": accent }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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

      <div className="column-body" ref={bodyRef}>
        {items}
        {tasks.length === 0 && dropIndex == null && <p className="column-empty">Drop tasks here</p>}
      </div>

      <button className="add-task-btn" onClick={() => onAddTask(column)}>
        <PlusIcon size={16} /> Add task
      </button>
    </section>
  );
}
