from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_

from auth import login_required
from extensions import db
from models import PRIORITIES, BoardColumn, Task
from permissions import get_board_or_404, get_column_or_404, get_task_or_404

bp = Blueprint("tasks", __name__, url_prefix="/api")


def parse_task_fields(data, board, partial=False):
    """Validate incoming task data. Returns (fields, error_message)."""
    fields = {}

    if "title" in data or not partial:
        title = (data.get("title") or "").strip()
        if not title:
            return None, "Task title is required"
        fields["title"] = title[:200]

    if "description" in data:
        fields["description"] = (data.get("description") or "").strip()

    if "priority" in data:
        if data["priority"] not in PRIORITIES:
            return None, "Priority must be one of: " + ", ".join(PRIORITIES)
        fields["priority"] = data["priority"]

    if "due_date" in data:
        raw = data["due_date"]
        if raw in (None, ""):
            fields["due_date"] = None
        else:
            try:
                fields["due_date"] = date.fromisoformat(raw)
            except (TypeError, ValueError):
                return None, "Due date must be in YYYY-MM-DD format"

    if "assignee_id" in data:
        raw = data["assignee_id"]
        if raw in (None, ""):
            fields["assignee_id"] = None
        else:
            try:
                assignee_id = int(raw)
            except (TypeError, ValueError):
                return None, "Invalid assignee"
            if not any(m.id == assignee_id for m in board.members):
                return None, "Assignee must be a member of this board"
            fields["assignee_id"] = assignee_id

    return fields, None


@bp.post("/columns/<int:column_id>/tasks")
@login_required
def create_task(column_id):
    column = get_column_or_404(column_id)
    fields, error = parse_task_fields(request.get_json(silent=True) or {}, column.board)
    if error:
        return jsonify(error=error), 400

    position = Task.query.filter_by(column_id=column.id).count()
    task = Task(
        board_id=column.board_id,
        column_id=column.id,
        position=position,
        created_by=g.user.id,
        **fields,
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task=task.to_dict()), 201


@bp.get("/tasks/<int:task_id>")
@login_required
def get_task(task_id):
    return jsonify(task=get_task_or_404(task_id).to_dict())


@bp.patch("/tasks/<int:task_id>")
@login_required
def update_task(task_id):
    task = get_task_or_404(task_id)
    fields, error = parse_task_fields(request.get_json(silent=True) or {}, task.board, partial=True)
    if error:
        return jsonify(error=error), 400

    for key, value in fields.items():
        setattr(task, key, value)
    db.session.commit()
    return jsonify(task=task.to_dict())


@bp.delete("/tasks/<int:task_id>")
@login_required
def delete_task(task_id):
    task = get_task_or_404(task_id)
    board_id = task.board_id
    db.session.delete(task)
    db.session.commit()
    return "", 204


@bp.patch("/tasks/<int:task_id>/move")
@login_required
def move_task(task_id):
    """Move a task to `column_id` at index `position`, re-numbering affected columns."""
    task = get_task_or_404(task_id)
    data = request.get_json(silent=True) or {}

    target = db.session.get(BoardColumn, data.get("column_id") or task.column_id)
    if target is None or target.board_id != task.board_id:
        return jsonify(error="Target column not found on this board"), 400
    try:
        position = int(data.get("position", 0))
    except (TypeError, ValueError):
        return jsonify(error="Position must be an integer"), 400

    def ordered(column_id):
        rows = Task.query.filter_by(column_id=column_id).order_by(Task.position, Task.id).all()
        return [t for t in rows if t.id != task.id]

    source_id = task.column_id
    source = ordered(source_id)
    dest = source if target.id == source_id else ordered(target.id)

    dest.insert(max(0, min(position, len(dest))), task)
    task.column_id = target.id
    affected = {t.id: t for t in dest}
    if target.id != source_id:
        affected.update({t.id: t for t in source})
        for index, t in enumerate(source):
            t.position = index
    for index, t in enumerate(dest):
        t.position = index
    db.session.commit()

    ordering = [{"id": t.id, "column_id": t.column_id, "position": t.position} for t in affected.values()]
    return jsonify(task=task.to_dict(), tasks=ordering)


# ---------------------------------------------------------------- search & filter


@bp.get("/boards/<int:board_id>/tasks")
@login_required
def search_tasks(board_id):
    """Search and filter tasks.

    Query params:
      q         free-text search across title and description
      priority  low | medium | high | urgent (comma-separated for several)
      assignee  a user id, "me" or "none"
      due       overdue | today | week | none
      column_id restrict to one column
    """
    board = get_board_or_404(board_id)
    args = request.args
    query = Task.query.filter_by(board_id=board.id)

    if q := args.get("q", "").strip():
        like = f"%{q}%"
        query = query.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))

    if priority := args.get("priority"):
        wanted = [p for p in priority.split(",") if p in PRIORITIES]
        query = query.filter(Task.priority.in_(wanted))

    if assignee := args.get("assignee"):
        if assignee == "none":
            query = query.filter(Task.assignee_id.is_(None))
        elif assignee == "me":
            query = query.filter(Task.assignee_id == g.user.id)
        elif assignee.isdigit():
            query = query.filter(Task.assignee_id == int(assignee))

    today = date.today()
    due = args.get("due")
    if due == "overdue":
        query = query.filter(Task.due_date < today)
    elif due == "today":
        query = query.filter(Task.due_date == today)
    elif due == "week":
        query = query.filter(Task.due_date.between(today, today + timedelta(days=7)))
    elif due == "none":
        query = query.filter(Task.due_date.is_(None))

    if (column_id := args.get("column_id", "")).isdigit():
        query = query.filter(Task.column_id == int(column_id))

    tasks = query.order_by(Task.column_id, Task.position).all()
    return jsonify(tasks=[t.to_dict() for t in tasks], count=len(tasks))
