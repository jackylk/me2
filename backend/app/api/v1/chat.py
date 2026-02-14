"""聊天 API - 基于 JWT 认证的对话接口"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List
from datetime import datetime
from app.db.models import User, Session, Message
from app.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.services.conversation_engine import conversation_engine
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["聊天"])


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str
    session_id: Optional[str] = None  # 可选，不提供则创建新会话
    debug_mode: bool = False  # 调试模式


class ChatResponse(BaseModel):
    """聊天响应"""
    response: str
    session_id: str
    memories_recalled: int
    insights_used: int
    history_messages_count: int = 0
    debug_info: Optional[dict] = None  # 调试信息（仅debug_mode=True时返回）


class SessionCreate(BaseModel):
    """创建会话请求"""
    title: Optional[str] = None


class SessionResponse(BaseModel):
    """会话响应"""
    id: str
    title: Optional[str]
    created_at: datetime
    last_active_at: datetime
    message_count: int


class MessageResponse(BaseModel):
    """消息响应"""
    id: str
    role: str
    content: str
    created_at: datetime
    # 仅 assistant 消息有以下字段
    system_prompt: Optional[str] = None
    memories_recalled: Optional[int] = None
    insights_used: Optional[int] = None


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    request: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建新的对话会话"""
    try:
        session = Session(
            user_id=current_user.id,
            title=request.title
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        logger.info(f"创建新会话: {session.id}")

        return SessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            last_active_at=session.last_active_at,
            message_count=0
        )

    except Exception as e:
        logger.error(f"创建会话失败: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户的会话列表"""
    try:
        stmt = select(Session).where(
            Session.user_id == current_user.id
        ).order_by(desc(Session.last_active_at))

        result = await db.execute(stmt)
        sessions = result.scalars().all()

        # 获取每个会话的消息数量
        session_responses = []
        for session in sessions:
            msg_count_stmt = select(Message).where(
                Message.session_id == session.id
            )
            msg_result = await db.execute(msg_count_stmt)
            message_count = len(msg_result.scalars().all())

            session_responses.append(SessionResponse(
                id=session.id,
                title=session.title,
                created_at=session.created_at,
                last_active_at=session.last_active_at,
                message_count=message_count
            ))

        return session_responses

    except Exception as e:
        logger.error(f"获取会话列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取会话的消息历史"""
    try:
        # 验证会话属于当前用户
        stmt = select(Session).where(
            Session.id == session_id,
            Session.user_id == current_user.id
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")

        # 获取消息列表
        msg_stmt = select(Message).where(
            Message.session_id == session_id
        ).order_by(Message.created_at)

        msg_result = await db.execute(msg_stmt)
        messages = msg_result.scalars().all()

        return [MessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
            system_prompt=msg.system_prompt,
            memories_recalled=msg.meta.get("memories_count") if msg.meta else None,
            insights_used=msg.meta.get("insights_count") if msg.meta else None
        ) for msg in messages]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取消息历史失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """发送聊天消息

    需要 JWT 认证。user_id 从 token 中获取。
    如果不提供 session_id，会自动创建新会话。

    Args:
        request: 聊天请求
        current_user: 当前认证用户（从 JWT 获取）
        db: 数据库会话

    Returns:
        聊天响应
    """
    try:
        # 如果没有提供 session_id，创建新会话
        session_id = request.session_id
        if not session_id:
            session = Session(user_id=current_user.id)
            db.add(session)
            await db.flush()
            session_id = session.id
            logger.info(f"自动创建新会话: {session_id}")
        else:
            # 验证会话存在且属于当前用户
            stmt = select(Session).where(
                Session.id == session_id,
                Session.user_id == current_user.id
            )
            result = await db.execute(stmt)
            session = result.scalar_one_or_none()

            if not session:
                raise HTTPException(status_code=404, detail="会话不存在")

        # 调用对话引擎
        result = await conversation_engine.chat(
            user_id=current_user.id,
            session_id=session_id,
            message=request.message,
            db=db,
            debug_mode=request.debug_mode
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        response = ChatResponse(
            response=result["response"],
            session_id=session_id,
            memories_recalled=result["memories_recalled"],
            insights_used=result["insights_used"],
            history_messages_count=result.get("history_messages_count", 0)
        )

        # 添加调试信息
        if request.debug_mode and "debug_info" in result:
            response.debug_info = result["debug_info"]

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"聊天处理失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """流式聊天接口（SSE）

    返回 Server-Sent Events 流式响应，实时推送生成的内容。

    事件类型：
    - token: 生成的文本片段
    - done: 生成完成，包含完整响应和调试信息
    - error: 错误信息
    """
    async def event_generator():
        try:
            # 验证或创建会话
            session_id = request.session_id
            if not session_id:
                session = Session(user_id=current_user.id)
                db.add(session)
                await db.flush()
                session_id = session.id
                logger.info(f"自动创建新会话: {session_id}")
            else:
                stmt = select(Session).where(
                    Session.id == session_id,
                    Session.user_id == current_user.id
                )
                result = await db.execute(stmt)
                session = result.scalar_one_or_none()
                if not session:
                    yield f"data: {json.dumps({'type': 'error', 'error': '会话不存在'})}\n\n"
                    return

            # 调用流式对话引擎
            async for chunk in conversation_engine.chat_stream(
                user_id=current_user.id,
                session_id=session_id,
                message=request.message,
                db=db,
                debug_mode=request.debug_mode
            ):
                # chunk可能是字符串（token）或字典（done/error）
                if isinstance(chunk, str):
                    # 文本token
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
                elif isinstance(chunk, dict):
                    # 完成或错误
                    yield f"data: {json.dumps(chunk)}\n\n"

        except Exception as e:
            logger.error(f"流式聊天失败: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # 禁用nginx缓冲
        }
    )
