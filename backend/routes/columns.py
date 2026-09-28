from flask import Blueprint, jsonify, request

from auth import login_required
from extensions import db
from models import BoardColumn
from permissions import get_board_or_404, get_column_or_404

bp = Blueprint("columns", __name__, url_prefix="/api")


def clean_name(data):
    return (data.get("name") or "").strip()[:80]


@bp.post("/boards/<int:board_id>/columns")
@login_required
def create_column(board_id):
    board = get_board_or_404(board_id)
    name = clean_name(request.get_json(silent=True) or {})
    if not name:
        return jsonify(error="Column name is required"), 400

    column = BoardColumn(board_id=board.id, name=name, position=len(board.columns))
    db.session.add(column)
    db.session.commit()
    return jsonify(column=column.to_dict()), 201


@bp.patch("/columns/<int:column_id>")
@login_required
def rename_column(column_id):
    column = get_column_or_404(column_id)
    name = clean_name(request.get_json(silent=True) or {})
    if not name:
        return jsonify(error="Column name is required"), 400

    column.name = name
    db.session.commit()
    return jsonify(column=column.to_dict())


@bp.delete("/columns/<int:column_id>")
@login_required
def delete_column(column_id):
    column = get_column_or_404(column_id)
    board = column.board
    if len(board.columns) <= 1:
        return jsonify(error="A board needs at least one column"), 400

    db.session.delete(column)
    db.session.flush()
    remaining = BoardColumn.query.filter_by(board_id=board.id).order_by(BoardColumn.position).all()
    for position, col in enumerate(remaining):
        col.position = position
    db.session.commit()
    return "", 204
