import { useState } from "react";
import { PRIORITIES } from "../lib/constants.js";
import { formatDateTime } from "../lib/dates.js";
import { TrashIcon } from "./Icons.jsx";
import Modal from "./Modal.jsx";

/**
 * Create or edit a task. `task` is null when creating; `columnId` is the
 * column a new task starts in.
 */
export default function TaskModal({ task, columnId, columns, members, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "medium",
    due_date: task?.due_date ?? "",
    assignee_id: task?.assignee_id ?? "",
    column_id: task?.column_id ?? columnId,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const creator = members.find((m) => m.id === task?.created_by);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...form,
        column_id: Number(form.column_id),
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        due_date: form.due_date || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setBusy(true);
    try {
      await onDelete(task);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={task ? "Edit task" : "New task"}
      onClose={onClose}
      width={580}
      footer={
        <>
          {task && (
            <button type="button" className="btn btn-ghost btn-delete" onClick={handleDelete} disabled={busy}>
              <TrashIcon size={16} /> Delete
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn btn-primary" disabled={busy || !form.title.trim()}>
            {task ? "Save changes" : "Create task"}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}

        <div className="field">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            className="input input-lg"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="What needs to be done?"
            maxLength={200}
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            className="textarea"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Add more detail, links or acceptance criteria..."
          />
        </div>

        <div className="field">
          <label>Priority</label>
          <div className="priority-picker" role="radiogroup">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={form.priority === p.value}
                className={`priority-option priority-${p.value} ${form.priority === p.value ? "selected" : ""}`}
                onClick={() => set("priority", p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="task-column">Status</label>
            <select
              id="task-column"
              className="select"
              value={form.column_id}
              onChange={(e) => set("column_id", e.target.value)}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-assignee">Assignee</label>
            <select
              id="task-assignee"
              className="select"
              value={form.assignee_id}
              onChange={(e) => set("assignee_id", e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-due">Due date</label>
            <input
              id="task-due"
              type="date"
              className="input"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </div>
        </div>

        {task && (
          <p className="task-meta-line">
            Created {creator ? `by ${creator.name} ` : ""}on {formatDateTime(task.created_at)}
            {task.updated_at && task.updated_at !== task.created_at && ` · Updated ${formatDateTime(task.updated_at)}`}
          </p>
        )}
      </form>
    </Modal>
  );
}
