import re

from flask import Blueprint, abort, g, jsonify, request

from auth import login_required
from extensions import db
from models import DEFAULT_COLUMNS, Board, BoardColumn, Task, User
from permissions import get_board_or_404
from realtime import broadcast, evict_user, notify_users

bp = Blueprint("boards", __name__, url_prefix="/api")

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
DEFAULT_COLOR = "#6c5ce7"


@bp.get("/boards")
@login_required
def list_boards():
    boards = (
        Board.query.filter(Board.members.any(User.id == g.user.id))
        .order_by(Board.created_at.desc())
        .all()
    )
    return jsonify(boards=[b.to_dict() for b in boards])


@bp.post("/boards")
@login_required
def create_board():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(error="Board name is required"), 400

    color = data.get("color") or DEFAULT_COLOR
    board = Board(
        name=name[:120],
        description=(data.get("description") or "").strip()[:500],
        color=color if HEX_RE.match(color) else DEFAULT_COLOR,
        owner_id=g.user.id,
    )
    board.members.append(g.user)
    for position, column_name in enumerate(DEFAULT_COLUMNS):
        board.columns.append(BoardColumn(name=column_name, position=position))

    db.session.add(board)
    db.session.commit()
    return jsonify(board=board.to_dict(detail=True)), 201


@bp.get("/boards/<int:board_id>")
@login_required
def get_board(board_id):
    board = get_board_or_404(board_id)
    return jsonify(board=board.to_dict(detail=True))


@bp.patch("/boards/<int:board_id>")
@login_required
def update_board(board_id):
    board = get_board_or_404(board_id)
    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify(error="Board name is required"), 400
        board.name = name[:120]
    if "description" in data:
        board.description = (data.get("description") or "").strip()[:500]
    if "color" in data:
        if not HEX_RE.match(data.get("color") or ""):
            return jsonify(error="Color must be a hex value like #6c5ce7"), 400
        board.color = data["color"]

    db.session.commit()
    broadcast(board.id, "board:updated", {"board": board.to_dict()})
    return jsonify(board=board.to_dict())


@bp.delete("/boards/<int:board_id>")
@login_required
def delete_board(board_id):
    board = get_board_or_404(board_id)
    if board.owner_id != g.user.id:
        abort(403, description="Only the board owner can delete it")

    member_ids = [m.id for m in board.members]
    db.session.delete(board)
    db.session.commit()
    broadcast(board_id, "board:deleted", {"board_id": board_id})
    notify_users(member_ids, "boards:changed")
    return "", 204


@bp.post("/boards/<int:board_id>/members")
@login_required
def add_member(board_id):
    board = get_board_or_404(board_id)
    email = ((request.get_json(silent=True) or {}).get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify(error="No user found with that email"), 404
    if board.has_member(user):
        return jsonify(error=f"{user.name} is already on this board"), 409

    board.members.append(user)
    db.session.commit()
    broadcast(board.id, "member:added", {"user": user.to_dict()})
    notify_users([user.id], "boards:changed")
    return jsonify(user=user.to_dict()), 201


@bp.delete("/boards/<int:board_id>/members/<int:user_id>")
@login_required
def remove_member(board_id, user_id):
    board = get_board_or_404(board_id)
    if user_id == board.owner_id:
        return jsonify(error="The board owner cannot be removed"), 400
    if g.user.id not in (board.owner_id, user_id):
        abort(403, description="Only the board owner can remove other members")

    member = next((m for m in board.members if m.id == user_id), None)
    if member is None:
        abort(404, description="Member not found")

    Task.query.filter_by(board_id=board.id, assignee_id=user_id).update({"assignee_id": None})
    board.members.remove(member)
    db.session.commit()
    broadcast(board.id, "member:removed", {"user_id": user_id})
    evict_user(board.id, user_id)
    notify_users([user_id], "boards:changed")
    return "", 204
