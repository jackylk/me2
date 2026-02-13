"""
会话管理器 - 管理对话上下文
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.db.models import Session
from app.config import settings
import logging
import json

logger = logging.getLogger(__name__)


class SessionManager:
    """会话管理器"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_session(self, user_id: str) -> Session:
        """
        获取或创建活跃会话

        Args:
            user_id: 用户 ID

        Returns:
            Session 对象
        """
        # 查找活跃会话
        stmt = select(Session).where(
            Session.user_id == user_id,
            Session.is_active == True
        ).order_by(Session.last_activity_at.desc())
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if session:
            # 检查是否超时
            timeout_threshold = datetime.now(timezone.utc) - timedelta(
                seconds=settings.SESSION_TIMEOUT
            )
            if session.last_activity_at < timeout_threshold:
                # 会话超时，结束旧会话
                await self.end_session(session.id)
                session = None

        if not session:
            # 创建新会话
            session = Session(
                user_id=user_id,
                messages=[],
                context={},
                message_count=0
            )
            self.db.add(session)
            await self.db.commit()
            await self.db.refresh(session)
            logger.info(f"创建新会话: {session.id} for user {user_id}")

        return session

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        添加消息到会话

        Args:
            session_id: 会话 ID
            role: 角色 (user/assistant)
            content: 消息内容
            metadata: 元数据
        """
        stmt = select(Session).where(Session.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"会话不存在: {session_id}")

        # 构建消息对象
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {}
        }

        # 添加消息
        messages = session.messages or []
        messages.append(message)

        # 限制消息数量
        if len(messages) > settings.MAX_SESSION_MESSAGES:
            messages = messages[-settings.MAX_SESSION_MESSAGES:]

        # 更新会话
        session.messages = messages
        session.message_count = len(messages)
        session.last_activity_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def get_messages(
        self,
        session_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        获取会话消息

        Args:
            session_id: 会话 ID
            limit: 限制数量

        Returns:
            消息列表
        """
        stmt = select(Session).where(Session.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            return []

        messages = session.messages or []
        if limit:
            messages = messages[-limit:]

        return messages

    async def update_context(
        self,
        session_id: str,
        context: Dict[str, Any]
    ) -> None:
        """
        更新会话上下文

        Args:
            session_id: 会话 ID
            context: 上下文数据
        """
        stmt = select(Session).where(Session.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"会话不存在: {session_id}")

        # 合并上下文
        current_context = session.context or {}
        current_context.update(context)
        session.context = current_context

        await self.db.commit()

    async def end_session(self, session_id: str) -> None:
        """
        结束会话

        Args:
            session_id: 会话 ID
        """
        stmt = update(Session).where(
            Session.id == session_id
        ).values(
            is_active=False,
            ended_at=datetime.now(timezone.utc)
        )
        await self.db.execute(stmt)
        await self.db.commit()
        logger.info(f"会话已结束: {session_id}")

    async def cleanup_old_sessions(self, days: int = 7) -> int:
        """
        清理旧会话

        Args:
            days: 保留天数

        Returns:
            清理数量
        """
        threshold = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = select(Session).where(
            Session.is_active == False,
            Session.ended_at < threshold
        )
        result = await self.db.execute(stmt)
        sessions = result.scalars().all()

        for session in sessions:
            await self.db.delete(session)

        await self.db.commit()
        count = len(sessions)
        logger.info(f"清理了 {count} 个旧会话")
        return count
