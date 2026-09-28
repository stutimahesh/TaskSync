import random
from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db

AVATAR_COLORS = ["#6c5ce7", "#fd79a8", "#00b894", "#0984e3", "#e17055", "#fdcb6e", "#a29bfe", "#00cec9"]
PRIORITIES = ("low", "medium", "high", "urgent")
DEFAULT_COLUMNS = ("Todo", "In Progress", "Done")


def utcnow():
    return datetime.now(timezone.utc)


board_members = db.Table(
    "board_members",
    db.Column("board_id", db.Integer, db.ForeignKey("boards.id", ondelete="CASCADE"), primary_key=True),
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar_color = db.Column(db.String(7), default=lambda: random.choice(AVATAR_COLORS))
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "avatar_color": self.avatar_color}


class Board(db.Model):
    __tablename__ = "boards"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), default="")
    color = db.Column(db.String(7), default="#6c5ce7")
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    owner = db.relationship("User")
    members = db.relationship("User", secondary=board_members, lazy="selectin")
    columns = db.relationship(
        "BoardColumn", backref="board", cascade="all, delete-orphan", order_by="BoardColumn.position"
    )
    tasks = db.relationship("Task", backref="board", cascade="all, delete-orphan")

    def has_member(self, user):
        return any(m.id == user.id for m in self.members)

    def to_dict(self, detail=False):
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "members": [m.to_dict() for m in self.members],
            "task_count": len(self.tasks),
        }
        if detail:
            data["columns"] = [c.to_dict() for c in self.columns]
            data["tasks"] = [t.to_dict() for t in self.tasks]
        return data


class BoardColumn(db.Model):
    __tablename__ = "columns"

    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)

    tasks = db.relationship("Task", backref="column", cascade="all, delete-orphan", order_by="Task.position")

    def to_dict(self):
        return {"id": self.id, "board_id": self.board_id, "name": self.name, "position": self.position}


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    column_id = db.Column(db.Integer, db.ForeignKey("columns.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    priority = db.Column(db.String(10), nullable=False, default="medium")
    due_date = db.Column(db.Date, nullable=True)
    position = db.Column(db.Integer, nullable=False, default=0)
    assignee_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    assignee = db.relationship("User", foreign_keys=[assignee_id])

    def to_dict(self):
        return {
            "id": self.id,
            "board_id": self.board_id,
            "column_id": self.column_id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "position": self.position,
            "assignee_id": self.assignee_id,
            "assignee": self.assignee.to_dict() if self.assignee else None,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
