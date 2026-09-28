"""Populate the database with demo users and a sample board.

    python seed.py            # add demo data (skips if it already exists)
    python seed.py --reset    # drop everything first
"""
import sys
from datetime import date, timedelta

from app import app
from extensions import db
from models import DEFAULT_COLUMNS, Board, BoardColumn, Task, User

DEMO_PASSWORD = "password123"
USERS = [
    ("Stuti Mahesh", "stuti@tasksync.dev", "#6c5ce7"),
    ("Arjun Rao", "arjun@tasksync.dev", "#fd79a8"),
    ("Maya Chen", "maya@tasksync.dev", "#00b894"),
]

# (column index, title, description, priority, due in days or None, assignee index or None)
TASKS = [
    (0, "Design onboarding screens", "Wireframes for signup and first-board flow.", "high", 3, 2),
    (0, "Write API documentation", "Document every REST endpoint and socket event.", "medium", 7, 0),
    (0, "Add keyboard shortcuts", "", "low", None, None),
    (1, "Real-time presence indicators", "Show who is viewing a board right now.", "urgent", 0, 1),
    (1, "Task search and filters", "Filter by text, priority, assignee and due date.", "high", 1, 0),
    (2, "Database schema", "Users, boards, columns, tasks and memberships.", "medium", -2, 0),
    (2, "JWT authentication", "Signup, login and protected routes.", "high", -4, 1),
]


def seed():
    if "--reset" in sys.argv:
        db.drop_all()
        db.create_all()

    if User.query.filter_by(email=USERS[0][1]).first():
        print("Demo data already present - run with --reset to recreate it.")
        return

    users = []
    for name, email, color in USERS:
        user = User(name=name, email=email, avatar_color=color)
        user.set_password(DEMO_PASSWORD)
        users.append(user)
    db.session.add_all(users)

    board = Board(
        name="TaskSync Launch",
        description="Everything needed to ship the MVP.",
        color="#6c5ce7",
        owner=users[0],
    )
    board.members.extend(users)
    columns = [BoardColumn(name=name, position=i) for i, name in enumerate(DEFAULT_COLUMNS)]
    board.columns.extend(columns)
    db.session.add(board)
    db.session.flush()

    positions = {}
    for col_index, title, description, priority, due_in, assignee in TASKS:
        column = columns[col_index]
        positions[column.id] = positions.get(column.id, -1) + 1
        db.session.add(
            Task(
                board_id=board.id,
                column_id=column.id,
                title=title,
                description=description,
                priority=priority,
                due_date=date.today() + timedelta(days=due_in) if due_in is not None else None,
                assignee_id=users[assignee].id if assignee is not None else None,
                position=positions[column.id],
                created_by=users[0].id,
            )
        )

    db.session.commit()
    print("Seeded demo data. Log in with any of:")
    for _, email, _ in USERS:
        print(f"  {email} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    with app.app_context():
        seed()
