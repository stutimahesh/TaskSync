import { PRIORITIES } from "../lib/constants.js";
import { dueStatus, formatDue } from "../lib/dates.js";
import Avatar from "./Avatar.jsx";
import { CalendarIcon, CheckIcon } from "./Icons.jsx";

export default function TaskCard({ task, done, onOpen }) {
  const priority = PRIORITIES.find((p) => p.value === task.priority);
  const status = done ? "done" : dueStatus(task.due_date);

  return (
    <article
      className={`task-card priority-${task.priority} ${done ? "is-done" : ""}`}
      data-task-id={task.id}
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(task)}
    >
      <div className="task-card-top">
        <span className="priority-badge">{priority?.label}</span>
        {done && (
          <span className="done-check" title="Done">
            <CheckIcon size={14} />
          </span>
        )}
      </div>

      <h4>{task.title}</h4>
      {task.description && <p className="task-card-desc">{task.description}</p>}

      {(task.due_date || task.assignee) && (
        <div className="task-card-footer">
          {task.due_date ? (
            <span className={`due-chip due-${status}`}>
              <CalendarIcon size={13} />
              {formatDue(task.due_date)}
            </span>
          ) : (
            <span />
          )}
          {task.assignee && <Avatar user={task.assignee} size={26} title={`Assigned to ${task.assignee.name}`} />}
        </div>
      )}
    </article>
  );
}
