"""Me2 Providers"""

try:
    from .local_embedding import LocalEmbedding
    __all__ = ["LocalEmbedding"]
except ImportError:
    # sentence-transformers 未安装
    __all__ = []

# OpenAI Embedding 总是可用（不依赖 torch）
from .openai_embedding import OpenAIEmbedding
__all__.append("OpenAIEmbedding")
