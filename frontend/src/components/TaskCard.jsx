import { PRIORITIES } from "../lib/constants.js";

export default function TaskCard({ task, onOpen }) {
  const priority = PRIORITIES.find((p) => p.value === task.priority);

  return (
    <div className="task-card" data-task-id={task.id} onClick={() => onOpen(task)}>
      <span className={`priority-badge priority-${task.priority}`}>{priority?.label}</span>
      <h4>{task.title}</h4>
    </div>
  );
}
