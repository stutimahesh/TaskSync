// Board state lives in a reducer so REST responses, optimistic updates and
// Socket.IO events all funnel through the same, idempotent transitions.
//
// Shape: { ...boardFields, columns: [column], tasks: { [id]: task } }

const byPosition = (a, b) => a.position - b.position || a.id - b.id;

export function normalizeBoard(board) {
  const { tasks = [], columns = [], ...rest } = board;
  return {
    ...rest,
    columns: [...columns].sort(byPosition),
    tasks: Object.fromEntries(tasks.map((t) => [t.id, t])),
  };
}

/** Tasks of one column, ordered by position. */
export function columnTasks(state, columnId) {
  return Object.values(state.tasks)
    .filter((t) => t.column_id === columnId)
    .sort(byPosition);
}

/**
 * Mirror of the server's move algorithm: pull the task out of its column and
 * insert it at `index` in the target column, renumbering both columns.
 */
export function moveTaskLocal(tasks, taskId, toColumnId, index) {
  const task = tasks[taskId];
  if (!task) return tasks;
  const next = { ...tasks };
  const ordered = (colId) =>
    Object.values(tasks)
      .filter((t) => t.column_id === colId && t.id !== taskId)
      .sort(byPosition);

  const source = ordered(task.column_id);
  const dest = toColumnId === task.column_id ? source : ordered(toColumnId);
  dest.splice(Math.max(0, Math.min(index, dest.length)), 0, { ...task, column_id: toColumnId });

  dest.forEach((t, i) => (next[t.id] = { ...t, position: i }));
  if (toColumnId !== task.column_id) source.forEach((t, i) => (next[t.id] = { ...t, position: i }));
  return next;
}

export function boardReducer(state, action) {
  if (action.type === "load") return normalizeBoard(action.board);
  if (!state) return state;

  switch (action.type) {
    case "board:update": {
      const { columns: _c, tasks: _t, ...fields } = action.board;
      return { ...state, ...fields };
    }

    case "column:upsert": {
      const others = state.columns.filter((c) => c.id !== action.column.id);
      return { ...state, columns: [...others, action.column].sort(byPosition) };
    }

    case "column:remove": {
      const tasks = Object.fromEntries(
        Object.entries(state.tasks).filter(([, t]) => t.column_id !== action.columnId)
      );
      const columns = state.columns
        .filter((c) => c.id !== action.columnId)
        .map((c, i) => ({ ...c, position: i }));
      return { ...state, columns, tasks };
    }

    case "task:upsert":
      return { ...state, tasks: { ...state.tasks, [action.task.id]: action.task } };

    case "task:remove": {
      const { [action.taskId]: _removed, ...tasks } = state.tasks;
      return { ...state, tasks };
    }

    case "task:move":
      return { ...state, tasks: moveTaskLocal(state.tasks, action.taskId, action.columnId, action.index) };

    case "tasks:reorder": {
      const tasks = { ...state.tasks };
      for (const { id, column_id, position } of action.tasks) {
        if (tasks[id]) tasks[id] = { ...tasks[id], column_id, position };
      }
      return { ...state, tasks };
    }

    case "member:add":
      if (state.members.some((m) => m.id === action.user.id)) return state;
      return { ...state, members: [...state.members, action.user] };

    case "member:remove": {
      const tasks = { ...state.tasks };
      for (const t of Object.values(tasks)) {
        if (t.assignee_id === action.userId) tasks[t.id] = { ...t, assignee_id: null, assignee: null };
      }
      return { ...state, members: state.members.filter((m) => m.id !== action.userId), tasks };
    }

    default:
      return state;
  }
}
