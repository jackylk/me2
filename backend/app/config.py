"""
配置管理模块
"""
from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path


class Settings(BaseSettings):
    """应用配置"""

    # App
    APP_NAME: str = "Me2"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    # Database (Me2 用户表 + NeuroMemory 共用)
    DATABASE_URL: str = "postgresql+asyncpg://neuromemory:neuromemory@localhost:5432/neuromemory"

    # JWT 认证
    JWT_SECRET: str = "change-me-in-production-use-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # LLM - DeepSeek
    DEEPSEEK_API_KEY: str = ""  # 需要配置
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # OpenAI API (用于 Embedding，可选)
    OPENAI_API_KEY: str = ""  # 如果不配置，会使用 DEEPSEEK_API_KEY
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"  # 可改为 SiliconFlow 等兼容服务

    # Embedding - 本地模型
    EMBEDDING_MODEL: str = "BAAI/bge-small-zh-v1.5"  # 中文优化，512 维
    EMBEDDING_DIMENSIONS: int = 512  # embedding 维度，需与模型匹配
    # 其他可选模型：
    # - BAAI/bge-base-zh-v1.5 (768 维，更准确但更慢)
    # - BAAI/bge-large-zh-v1.5 (1024 维，SiliconFlow)
    # - sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384 维，多语言)

    # NeuroMemory 配置
    NEUROMEMORY_EXTRACTION_INTERVAL: int = 10  # 每 10 条消息提取记忆
    NEUROMEMORY_REFLECTION_INTERVAL: int = 20  # 每 20 次提取后反思（约200条对话）
    NEUROMEMORY_IDLE_TIMEOUT: int = 600  # 闲置 10 分钟后自动提取和反思
    NEUROMEMORY_GRAPH_ENABLED: bool = True  # 启用知识图谱

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3333", "http://127.0.0.1:3333"]

    # 主动关心
    PROACTIVE_CHECK_INTERVAL: int = 3600  # 每小时检查一次（未来功能）

    class Config:
        env_file = ".env"
        case_sensitive = True


# 全局配置实例
settings = Settings()


