"""认证 API 端点"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.dependencies import get_db
from app.services.auth_service import get_password_hash, verify_password, create_access_token
from app.db.models import User

router = APIRouter(prefix="/auth", tags=["认证"])


class RegisterRequest(BaseModel):
    """注册请求"""
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    """登录请求"""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"


@router.options("/register")
@router.options("/login")
async def options_handler():
    """处理 CORS 预检请求"""
    return Response(status_code=200)


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """用户注册"""
    # 检查用户名是否已存在
    result = await db.execute(select(User).where(User.username == req.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已存在")

    # 检查邮箱是否已存在
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="邮箱已被使用")

    # 创建用户
    user = User(
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 生成 token
    access_token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    # 更新最后登录时间
    user.last_login = datetime.utcnow()
    await db.commit()

    # 生成 token
    access_token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=access_token)
