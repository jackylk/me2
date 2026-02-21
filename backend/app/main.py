"""
Me2 FastAPI 主应用
"""
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import settings
from app.db.database import init_db, close_db
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from neuromemory import (
    NeuroMemory, OpenAILLM, ExtractionStrategy,
    SiliconFlowEmbedding, OpenAIEmbedding,
)

try:
    from neuromemory import SentenceTransformerEmbedding
    USE_LOCAL_EMBEDDING = SentenceTransformerEmbedding is not None
except ImportError:
    SentenceTransformerEmbedding = None
    USE_LOCAL_EMBEDDING = False

if not USE_LOCAL_EMBEDDING:
    logger.warning("⚠️  sentence-transformers 未安装，使用远程 Embedding API")

# 全局 NeuroMemory 实例
nm: NeuroMemory = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global nm

    # ========== 启动时 ==========
    logger.info("🚀 Me2 启动中...")

    # 1. 初始化数据库（Me2 用户表）
    logger.info("📦 初始化数据库...")
    await init_db()

    # 2. 初始化 NeuroMemory
    logger.info("🧠 初始化 NeuroMemory...")
    try:
        # 选择 Embedding Provider
        embedding_provider = None
        use_local = (
            settings.EMBEDDING_PROVIDER == "local"
            or (settings.EMBEDDING_PROVIDER == "auto" and USE_LOCAL_EMBEDDING)
        )

        if use_local and SentenceTransformerEmbedding:
            try:
                logger.info("📦 尝试使用本地 Embedding 模型...")
                embedding_provider = SentenceTransformerEmbedding(
                    model=settings.EMBEDDING_MODEL,
                )
                logger.info("✅ 本地 Embedding 初始化成功")
            except Exception as e:
                logger.warning(f"⚠️  本地 Embedding 初始化失败: {e}")
                logger.info("🌐 切换到远程 Embedding API")

        if embedding_provider is None:
            api_key = settings.OPENAI_API_KEY or settings.DEEPSEEK_API_KEY
            base_url = settings.OPENAI_BASE_URL
            model = settings.REMOTE_EMBEDDING_MODEL
            dimensions = settings.REMOTE_EMBEDDING_DIMENSIONS

            # SiliconFlow 使用专用 Provider
            if "siliconflow" in base_url:
                logger.info(f"🌐 使用 SiliconFlowEmbedding: {model} ({dimensions}D)")
                embedding_provider = SiliconFlowEmbedding(
                    api_key=api_key,
                    model=model,
                    base_url=base_url,
                    dimensions=dimensions,
                )
            else:
                logger.info(f"🌐 使用 OpenAIEmbedding: {model} ({dimensions}D)")
                embedding_provider = OpenAIEmbedding(
                    api_key=api_key,
                    model=model,
                    base_url=base_url,
                    dimensions=dimensions,
                )

        nm = NeuroMemory(
            database_url=settings.DATABASE_URL,
            embedding=embedding_provider,
            llm=OpenAILLM(
                api_key=settings.DEEPSEEK_API_KEY,
                model=settings.DEEPSEEK_MODEL,
                base_url=settings.DEEPSEEK_BASE_URL,
            ),
            extraction=ExtractionStrategy(
                message_interval=settings.NEUROMEMORY_EXTRACTION_INTERVAL,
                idle_timeout=settings.NEUROMEMORY_IDLE_TIMEOUT,
                reflection_interval=settings.NEUROMEMORY_REFLECTION_INTERVAL,
                on_session_close=True,
                on_shutdown=True,
            ),
            graph_enabled=settings.NEUROMEMORY_GRAPH_ENABLED,
            echo=settings.DEBUG,  # 启用SQL日志以调试事务问题
        )
        await nm.init()
        logger.info("✅ NeuroMemory 初始化完成")
    except Exception as e:
        logger.error(f"❌ NeuroMemory 初始化失败: {e}")
        raise

    logger.info("✅ Me2 启动完成")

    yield

    # ========== 关闭时 ==========
    logger.info("👋 Me2 关闭中...")

    # 关闭 NeuroMemory
    if nm:
        logger.info("🧠 关闭 NeuroMemory...")
        await nm.close()

    # 关闭数据库
    logger.info("📦 关闭数据库连接...")
    await close_db()

    logger.info("✅ Me2 关闭完成")


# 创建应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="像朋友一样懂你的 AI 伙伴",
    lifespan=lifespan
)

# 配置 CORS
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

ALLOWED_ORIGINS = set(settings.ALLOWED_ORIGINS)

class CORSHandler(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")

        # OPTIONS 预检请求
        if request.method == "OPTIONS":
            response = Response(status_code=200)
            if origin in ALLOWED_ORIGINS:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "content-type, authorization"
            response.headers["Access-Control-Max-Age"] = "3600"
            return response

        # 正常请求
        response = await call_next(request)
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = "*"
        return response

app.add_middleware(CORSHandler)

# 注册路由
from app.api.v1 import auth, chat, memories
app.include_router(auth.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(memories.router, prefix="/api/v1")


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "像朋友一样懂你的 AI 伙伴",
        "status": "running"
    }


@app.get("/health")
async def health():
    """健康检查"""
    nm_status = "healthy" if nm is not None else "not_initialized"
    return {"status": "healthy", "neuromemory": nm_status}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
