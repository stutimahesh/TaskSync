from flask import abort, g

from extensions import db
from models import Board, BoardColumn, Task


def get_board_or_404(board_id):
    board = db.session.get(Board, board_id)
    if board is None or not board.has_member(g.user):
        abort(404, description="Board not found")
    return board


def get_column_or_404(column_id):
    column = db.session.get(BoardColumn, column_id)
    if column is None or not column.board.has_member(g.user):
        abort(404, description="Column not found")
    return column


def get_task_or_404(task_id):
    task = db.session.get(Task, task_id)
    if task is None or not task.board.has_member(g.user):
        abort(404, description="Task not found")
    return task
