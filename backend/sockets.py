"""Socket.IO event handlers: authentication, board rooms and presence."""
from flask import request
from flask_socketio import join_room, leave_room

from auth import user_from_token
from extensions import db, socketio
from models import Board
from realtime import board_presence, connected_users, emit_presence, room_for, user_room


@socketio.on("connect")
def on_connect(auth=None):
    user = user_from_token((auth or {}).get("token"))
    if user is None:
        return False  # reject unauthenticated sockets
    connected_users[request.sid] = user.to_dict()
    join_room(user_room(user.id))


@socketio.on("disconnect")
def on_disconnect(*_args):
    sid = request.sid
    for board_id, sids in list(board_presence.items()):
        if sid in sids:
            sids.discard(sid)
            emit_presence(board_id)
    connected_users.pop(sid, None)


def _board_id(data):
    try:
        return int((data or {}).get("board_id"))
    except (TypeError, ValueError):
        return None


@socketio.on("board:join")
def on_join_board(data):
    user = connected_users.get(request.sid)
    board_id = _board_id(data)
    board = db.session.get(Board, board_id) if board_id else None
    if user is None or board is None or not any(m.id == user["id"] for m in board.members):
        return {"ok": False, "error": "Board not found"}

    join_room(room_for(board_id))
    board_presence[board_id].add(request.sid)
    emit_presence(board_id)
    return {"ok": True}


@socketio.on("board:leave")
def on_leave_board(data):
    board_id = _board_id(data)
    if board_id is None:
        return
    leave_room(room_for(board_id))
    board_presence[board_id].discard(request.sid)
    emit_presence(board_id)
