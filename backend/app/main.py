"""
Me2 FastAPI 主应用
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.db.database import init_db, close_db
try:
    from app.providers import LocalEmbedding
    USE_LOCAL_EMBEDDING = True
except ImportError:
    USE_LOCAL_EMBEDDING = False
    logger.warning("⚠️  sentence-transformers 未安装，使用远程 Embedding API")

# OpenAI Embedding 总是导入（不依赖 torch）
from app.providers.openai_embedding import OpenAIEmbedding
from neuromemory import NeuroMemory, OpenAILLM, ExtractionStrategy
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
        # 选择 Embedding Provider（优先尝试本地，失败则使用远程）
        embedding_provider = None
        if USE_LOCAL_EMBEDDING:
            try:
                logger.info("📦 尝试使用本地 Embedding 模型...")
                embedding_provider = LocalEmbedding(model_name=settings.EMBEDDING_MODEL)
                logger.info("✅ 本地 Embedding 初始化成功")
            except Exception as e:
                logger.warning(f"⚠️  本地 Embedding 初始化失败: {e}")
                logger.info("🌐 切换到远程 Embedding API")

        if embedding_provider is None:
            logger.info("🌐 使用远程 Embedding API (OpenAI 兼容)")
            # 使用 OpenAI 的 embedding API
            # 如果需要，可以在 .env 中添加 OPENAI_API_KEY
            api_key = getattr(settings, 'OPENAI_API_KEY', settings.DEEPSEEK_API_KEY)
            embedding_provider = OpenAIEmbedding(
                api_key=api_key,
                base_url="https://api.openai.com/v1",  # OpenAI API
                model="text-embedding-3-small",
                dimensions=1536
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
                reflection_interval=settings.NEUROMEMORY_REFLECTION_INTERVAL,
                on_session_close=True,
                on_shutdown=True,
            ),
            graph_enabled=settings.NEUROMEMORY_GRAPH_ENABLED,
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
from app.api.v1 import auth, chat
app.include_router(auth.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


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
    # 检查 NeuroMemory 是否正常
    nm_status = "healthy" if nm is not None else "not_initialized"

    return {
        "status": "healthy",
        "neuromemory": nm_status
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
