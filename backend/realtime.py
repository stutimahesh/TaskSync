"""Helpers for pushing board changes to connected Socket.IO clients."""
from collections import defaultdict

from flask import has_request_context, request
from flask_socketio import leave_room

from extensions import socketio

connected_users = {}  # sid -> user dict
board_presence = defaultdict(set)  # board_id -> {sid, ...}


def room_for(board_id):
    return f"board:{board_id}"


def user_room(user_id):
    return f"user:{user_id}"


def presence_payload(board_id):
    users = {}
    for sid in board_presence.get(board_id, ()):
        user = connected_users.get(sid)
        if user:
            users[user["id"]] = user
    return {"board_id": board_id, "users": list(users.values())}


def emit_presence(board_id):
    socketio.emit("presence", presence_payload(board_id), to=room_for(board_id))


def broadcast(board_id, event, payload):
    """Emit to everyone viewing a board, skipping the socket that made the REST call.

    The client sends its socket id in the X-Socket-ID header; it already applied
    the change from the HTTP response, so echoing it back would be redundant.
    """
    skip_sid = request.headers.get("X-Socket-ID") if has_request_context() else None
    socketio.emit(event, payload, to=room_for(board_id), skip_sid=skip_sid or None)


def notify_users(user_ids, event, payload=None):
    for user_id in user_ids:
        socketio.emit(event, payload or {}, to=user_room(user_id))


def evict_user(board_id, user_id):
    """Remove a user's sockets from a board room (e.g. after they lose access)."""
    for sid in list(board_presence.get(board_id, ())):
        if connected_users.get(sid, {}).get("id") == user_id:
            leave_room(room_for(board_id), sid=sid, namespace="/")
            board_presence[board_id].discard(sid)
    emit_presence(board_id)
