"""本地 Embedding Provider
使用 HuggingFace sentence-transformers 模型
"""

from neuromemory.providers.embedding import EmbeddingProvider


class LocalEmbedding(EmbeddingProvider):
    """本地 Embedding Provider，使用 sentence-transformers

    推荐模型：
    - BAAI/bge-small-zh-v1.5 (中文优化, 512 dims, ~100MB)
    - BAAI/bge-base-zh-v1.5 (中文优化, 768 dims, ~400MB)
    - sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (多语言, 384 dims, ~450MB)

    首次使用时自动下载模型到 ~/.cache/huggingface/
    """

    def __init__(self, model_name: str = "BAAI/bge-small-zh-v1.5"):
        """初始化本地 Embedding 模型

        Args:
            model_name: HuggingFace 模型名称
        """
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            raise ImportError(
                "请安装 sentence-transformers:\n"
                "pip install sentence-transformers"
            )

        print(f"📥 加载 Embedding 模型: {model_name}")
        print("   首次运行需要下载模型，之后从本地缓存加载")

        self._model = SentenceTransformer(model_name)
        self._dims = self._model.get_sentence_embedding_dimension()

        print(f"✅ 模型加载完成 (维度: {self._dims})")

    @property
    def dims(self) -> int:
        """返回 embedding 维度"""
        return self._dims

    async def embed(self, text: str) -> list[float]:
        """生成单个文本的 embedding

        Args:
            text: 输入文本

        Returns:
            embedding 向量
        """
        result = await self.embed_batch([text])
        return result[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """批量生成 embeddings

        Args:
            texts: 文本列表

        Returns:
            embedding 向量列表
        """
        # normalize_embeddings=True 会归一化向量，便于余弦相似度计算
        embeddings = self._model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,  # 不显示进度条
        )
        return [e.tolist() for e in embeddings]
