import { useState } from "react";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

export default function MembersModal({ board, currentUser, onlineIds, onClose, onInvite, onRemove }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isOwner = board.owner_id === currentUser.id;

  async function handleInvite(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const user = await onInvite(email.trim());
      setMessage(`${user.name} now has access to this board.`);
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(member) {
    const self = member.id === currentUser.id;
    const prompt = self ? "Leave this board?" : `Remove ${member.name} from this board? Their tasks will be unassigned.`;
    if (!window.confirm(prompt)) return;
    try {
      await onRemove(member);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Board members" onClose={onClose} width={500}>
      <form className="invite-form" onSubmit={handleInvite}>
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Invite by email address"
          aria-label="Email address to invite"
          required
        />
        <button className="btn btn-primary" disabled={busy || !email.trim()}>
          Invite
        </button>
      </form>
      <p className="invite-hint">People need a TaskSync account before they can be invited.</p>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="notice">{message}</p>}

      <ul className="member-list">
        {board.members.map((m) => (
          <li key={m.id}>
            <span className={`member-avatar ${onlineIds.has(m.id) ? "is-online" : ""}`}>
              <Avatar user={m} size={38} />
            </span>
            <div className="member-info">
              <strong>
                {m.name}
                {m.id === currentUser.id && " (you)"}
              </strong>
              <span>{m.email}</span>
            </div>
            {m.id === board.owner_id ? (
              <span className="badge">Owner</span>
            ) : (
              (isOwner || m.id === currentUser.id) && (
                <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(m)}>
                  {m.id === currentUser.id ? "Leave" : "Remove"}
                </button>
              )
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
