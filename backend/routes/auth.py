import re

from flask import Blueprint, g, jsonify, request

from auth import create_token, login_required
from extensions import db
from models import User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def auth_response(user, status=200):
    return jsonify(token=create_token(user.id), user=user.to_dict()), status


@bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name:
        return jsonify(error="Name is required"), 400
    if not EMAIL_RE.match(email):
        return jsonify(error="A valid email is required"), 400
    if len(password) < 6:
        return jsonify(error="Password must be at least 6 characters"), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error="An account with that email already exists"), 409

    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return auth_response(user, 201)


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(data.get("password") or ""):
        return jsonify(error="Invalid email or password"), 401
    return auth_response(user)


@bp.get("/me")
@login_required
def me():
    return jsonify(user=g.user.to_dict())
