import { useState } from "react";
import { PlusIcon } from "./Icons.jsx";

export default function AddColumn({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(name.trim());
    setName("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="add-column" onClick={() => setOpen(true)}>
        <PlusIcon /> Add column
      </button>
    );
  }

  return (
    <form className="add-column add-column-form" onSubmit={handleSubmit}>
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Column name, e.g. Review"
        maxLength={80}
        autoFocus
      />
      <div className="add-column-actions">
        <button className="btn btn-primary btn-sm" disabled={!name.trim()}>
          Add
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
