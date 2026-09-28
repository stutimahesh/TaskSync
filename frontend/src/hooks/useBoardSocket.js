import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../lib/socket.js";

/**
 * Join a board's Socket.IO room and translate server events into reducer
 * actions. Other callbacks: onPresence(users), onAccessLost(reason) and
 * onResync() (called after a reconnect, since events may have been missed).
 */
export default function useBoardSocket(boardId, dispatch, callbacks) {
  const { token, user } = useAuth();
  const cb = useRef(callbacks);
  cb.current = callbacks;

  useEffect(() => {
    if (!token) return undefined;
    const socket = getSocket(token);
    let connectedBefore = socket.connected;

    const join = () =>
      socket.emit("board:join", { board_id: boardId }, (res) => {
        if (res && !res.ok) cb.current.onAccessLost?.("You no longer have access to this board.");
      });

    const onBoard = (fn) => (payload) => {
      const id = payload.task?.board_id ?? payload.column?.board_id ?? payload.board?.id ?? payload.board_id;
      if (id === undefined || id === boardId) fn(payload);
    };

    const handlers = {
      connect: () => {
        if (connectedBefore) cb.current.onResync?.();
        connectedBefore = true;
        join();
      },
      presence: (p) => p.board_id === boardId && cb.current.onPresence?.(p.users),
      "board:updated": onBoard(({ board }) => dispatch({ type: "board:update", board })),
      "board:deleted": onBoard(() => cb.current.onAccessLost?.("This board was deleted.")),
      "column:created": onBoard(({ column }) => dispatch({ type: "column:upsert", column })),
      "column:updated": onBoard(({ column }) => dispatch({ type: "column:upsert", column })),
      "column:deleted": ({ column_id }) => dispatch({ type: "column:remove", columnId: column_id }),
      "task:created": onBoard(({ task }) => dispatch({ type: "task:upsert", task })),
      "task:updated": onBoard(({ task }) => dispatch({ type: "task:upsert", task })),
      "task:deleted": ({ task_id }) => dispatch({ type: "task:remove", taskId: task_id }),
      "tasks:reordered": ({ tasks }) => dispatch({ type: "tasks:reorder", tasks }),
      "member:added": ({ user: member }) => dispatch({ type: "member:add", user: member }),
      "member:removed": ({ user_id }) => {
        if (user_id === user?.id) cb.current.onAccessLost?.("You were removed from this board.");
        else dispatch({ type: "member:remove", userId: user_id });
      },
    };

    for (const [event, fn] of Object.entries(handlers)) socket.on(event, fn);
    if (socket.connected) join();

    return () => {
      socket.emit("board:leave", { board_id: boardId });
      for (const [event, fn] of Object.entries(handlers)) socket.off(event, fn);
    };
  }, [boardId, token, user?.id, dispatch]);
}
