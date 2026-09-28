import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'tasksync.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_EXPIRES_HOURS = int(os.environ.get("JWT_EXPIRES_HOURS", 24))
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
