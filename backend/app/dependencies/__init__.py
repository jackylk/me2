"""依赖注入模块 - 集中导出所有依赖项"""
from app.db.database import get_db

__all__ = ["get_db"]
