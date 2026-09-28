import { useState } from "react";
import { BOARD_COLORS } from "../lib/constants.js";
import Modal from "./Modal.jsx";

/** Create a new board, or edit one when `board` is passed. */
export default function BoardFormModal({ board, onClose, onSubmit }) {
  const [name, setName] = useState(board?.name ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
  const [color, setColor] = useState(board?.color ?? BOARD_COLORS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ name, description, color });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={board ? "Board settings" : "Create a board"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="board-form" className="btn btn-primary" disabled={busy || !name.trim()}>
            {board ? "Save changes" : "Create board"}
          </button>
        </>
      }
    >
      <form id="board-form" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="field">
          <label htmlFor="board-name">Board name</label>
          <input
            id="board-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product launch"
            maxLength={120}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="board-description">Description</label>
          <textarea
            id="board-description"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this board for?"
            maxLength={500}
          />
        </div>
        <div className="field">
          <label>Colour</label>
          <div className="swatches">
            {BOARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${c === color ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
