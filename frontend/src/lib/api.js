const TOKEN_KEY = "tasksync-token";

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event("tasksync:unauthorized"));
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body });
const patch = (path, body) => request(path, { method: "PATCH", body });
const del = (path) => request(path, { method: "DELETE" });

export const api = {
  // auth
  signup: (body) => post("/auth/signup", body),
  login: (body) => post("/auth/login", body),
  me: () => request("/auth/me"),

  // boards
  listBoards: () => request("/boards"),
  createBoard: (body) => post("/boards", body),
  getBoard: (id) => request(`/boards/${id}`),
  updateBoard: (id, body) => patch(`/boards/${id}`, body),
  deleteBoard: (id) => del(`/boards/${id}`),
  addMember: (boardId, email) => post(`/boards/${boardId}/members`, { email }),
  removeMember: (boardId, userId) => del(`/boards/${boardId}/members/${userId}`),

  // columns
  createColumn: (boardId, name) => post(`/boards/${boardId}/columns`, { name }),
  renameColumn: (id, name) => patch(`/columns/${id}`, { name }),
  deleteColumn: (id) => del(`/columns/${id}`),

  // tasks
  createTask: (columnId, body) => post(`/columns/${columnId}/tasks`, body),
  updateTask: (id, body) => patch(`/tasks/${id}`, body),
  deleteTask: (id) => del(`/tasks/${id}`),
  moveTask: (id, columnId, position) => patch(`/tasks/${id}/move`, { column_id: columnId, position }),
  searchTasks: (boardId, params) => request(`/boards/${boardId}/tasks?${new URLSearchParams(params)}`),
};
