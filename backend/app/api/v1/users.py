"""
用户 API
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import User, MimicProfile
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    """创建用户请求"""
    username: str
    email: str | None = None


class UserResponse(BaseModel):
    """用户响应"""
    id: str
    username: str
    email: str | None
    created_at: datetime


@router.post("/", response_model=UserResponse)
async def create_user(
    request: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    创建用户

    Args:
        request: 创建请求
        db: 数据库会话

    Returns:
        用户对象
    """
    try:
        # 检查用户名是否已存在
        stmt = select(User).where(User.username == request.username)
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(status_code=400, detail="用户名已存在")

        # 创建用户
        user = User(
            username=request.username,
            email=request.email
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # 创建默认画像
        profile = MimicProfile(
            user_id=user.id,
            tone_style="友好",
            common_phrases=[],
            sentence_patterns=[],
            emoji_usage=0.3,
            punctuation_style={},
            response_length="medium",
            thinking_style="平衡",
            decision_patterns=[],
            value_priorities={},
            confidence=0.0,
            sample_count=0
        )
        db.add(profile)
        await db.commit()

        logger.info(f"创建用户成功: {user.id}")

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            created_at=user.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建用户失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户信息

    Args:
        user_id: 用户 ID
        db: 数据库会话

    Returns:
        用户对象
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at
    )
