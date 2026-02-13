"""
思维模仿引擎单元测试
"""
import pytest
from unittest.mock import patch, AsyncMock

from app.services.mimic_engine import MimicEngine


@pytest.mark.unit
@pytest.mark.asyncio
class TestMimicEngine:
    """思维模仿引擎测试类"""

    async def test_learn_from_message(
        self,
        db_session,
        test_user_id,
        create_test_profile
    ):
        """测试单条消息学习"""
        engine = MimicEngine(db_session)

        # 创建初始画像
        await create_test_profile(test_user_id, sample_count=0)

        # 学习消息
        await engine.learn_from_message(
            user_id=test_user_id,
            message="哈哈，今天天气真好！",
            update_now=True
        )

        # 验证画像更新
        from app.db.models import MimicProfile
        from sqlalchemy import select

        result = await db_session.execute(
            select(MimicProfile).where(MimicProfile.user_id == test_user_id)
        )
        profile = result.scalar_one()

        assert profile.sample_count == 1
        assert "哈哈" in profile.common_phrases or len(profile.common_phrases) > 0

    async def test_learn_from_batch(
        self,
        db_session,
        test_user_id,
        sample_messages
    ):
        """测试批量学习"""
        engine = MimicEngine(db_session)

        with patch.object(engine, '_extract_with_llm', new=AsyncMock(
            return_value={"tone_style": "活泼", "common_phrases": ["哈哈", "确实"], "thinking_style": "友好"}
        )):
            profile = await engine.learn_from_batch(
                user_id=test_user_id,
                messages=sample_messages
            )

            assert profile is not None
            assert profile.user_id == test_user_id
            assert profile.sample_count == len(sample_messages)
            assert profile.confidence > 0

    async def test_get_profile(
        self,
        db_session,
        test_user_id,
        create_test_profile
    ):
        """测试获取画像"""
        engine = MimicEngine(db_session)

        # 创建画像
        created_profile = await create_test_profile(
            test_user_id,
            tone_style="活泼",
            confidence=0.8
        )

        # 获取画像
        profile = await engine.get_profile(test_user_id)

        assert profile is not None
        assert profile["user_id"] == test_user_id
        assert profile["tone_style"] == "活泼"
        assert profile["confidence"] == 0.8

    async def test_get_profile_summary(
        self,
        db_session,
        test_user_id,
        create_test_profile
    ):
        """测试获取画像摘要"""
        engine = MimicEngine(db_session)

        await create_test_profile(
            test_user_id,
            tone_style="活泼",
            common_phrases=["哈哈", "确实", "感觉"],
            confidence=0.8,
            sample_count=50
        )

        summary = await engine.get_profile_summary(test_user_id)

        assert summary is not None
        assert "completeness" in summary
        assert "tone_style" in summary
        assert "confidence" in summary
        assert summary["sample_count"] == 50

    async def test_extract_linguistic_features(
        self,
        db_session,
        sample_messages
    ):
        """测试语言特征提取"""
        engine = MimicEngine(db_session)

        features = engine._extract_linguistic_features(sample_messages)

        assert "word_freq" in features
        assert "phrases" in features
        assert "punctuation" in features
        assert "emoji_usage" in features
        assert isinstance(features["word_freq"], dict)

    async def test_incremental_update(
        self,
        db_session,
        test_user_id,
        create_test_profile
    ):
        """测试增量更新"""
        engine = MimicEngine(db_session)

        # 创建初始画像
        profile = await create_test_profile(
            test_user_id,
            common_phrases=["你好"],
            sample_count=10
        )

        # 提取新特征
        new_features = engine._extract_linguistic_features(["哈哈，真有趣"])

        # 增量更新
        engine._incremental_update(profile, new_features, ["哈哈，真有趣"])

        assert profile.sample_count == 11
        # common_phrases 应该包含新短语

    async def test_consolidate_with_llm(
        self,
        db_session,
        test_user_id,
        create_test_profile
    ):
        """测试 LLM 整合"""
        engine = MimicEngine(db_session)

        profile = await create_test_profile(
            test_user_id,
            sample_count=50
        )

        with patch.object(engine, '_extract_with_llm', new=AsyncMock(
            return_value={"tone_style": "理性", "thinking_style": "分析型"}
        )):
            await engine._consolidate_with_llm(test_user_id, profile)

            # 验证 LLM 分析结果被应用

    async def test_confidence_calculation(
        self,
        db_session,
        test_user_id,
        create_test_profile
    ):
        """测试置信度计算"""
        engine = MimicEngine(db_session)

        # 样本少，置信度低
        profile1 = await create_test_profile(
            test_user_id + "_1",
            sample_count=5
        )
        summary1 = await engine.get_profile_summary(test_user_id + "_1")
        assert summary1["completeness"] < 0.5

        # 样本多，置信度高
        profile2 = await create_test_profile(
            test_user_id + "_2",
            sample_count=100
        )
        summary2 = await engine.get_profile_summary(test_user_id + "_2")
        assert summary2["completeness"] > 0.5

    async def test_profile_not_found(
        self,
        db_session,
        test_user_id
    ):
        """测试画像不存在"""
        engine = MimicEngine(db_session)

        profile = await engine.get_profile("nonexistent_user")

        # 应该返回默认画像
        assert profile is not None
        assert profile["confidence"] == 0.0

    async def test_empty_messages(
        self,
        db_session,
        test_user_id
    ):
        """测试空消息列表"""
        engine = MimicEngine(db_session)

        profile = await engine.learn_from_batch(
            user_id=test_user_id,
            messages=[]
        )

        # 应该创建默认画像或返回 None
        assert profile is None or profile.sample_count == 0


@pytest.mark.integration
@pytest.mark.asyncio
class TestMimicEngineIntegration:
    """思维模仿引擎集成测试"""

    @pytest.mark.requires_llm
    async def test_full_learning_cycle(
        self,
        db_session,
        test_user_id,
        sample_messages,
        skip_if_no_api_key
    ):
        """测试完整学习周期"""
        skip_if_no_api_key("deepseek")

        engine = MimicEngine(db_session)

        # 批量学习
        profile = await engine.learn_from_batch(
            user_id=test_user_id,
            messages=sample_messages
        )

        assert profile is not None
        assert profile.sample_count == len(sample_messages)

        # 增量学习
        for i in range(10):
            await engine.learn_from_message(
                user_id=test_user_id,
                message=f"增量消息 {i}"
            )

        # 获取最终画像
        final_profile = await engine.get_profile(test_user_id)
        assert final_profile["sample_count"] >= len(sample_messages) + 10

        print(f"Final profile: {final_profile}")
