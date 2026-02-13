"""
意图分析器
"""
from typing import List, Dict
import re


class IntentAnalyzer:
    """对话意图分析器"""

    # 意图类型
    CHAT = "CHAT"  # 闲聊
    EMOTIONAL = "EMOTIONAL"  # 情感表达
    ADVICE = "ADVICE"  # 寻求建议
    QUERY = "QUERY"  # 查询信息
    REFLECTION = "REFLECTION"  # 自我反思

    # 关键词模式
    PATTERNS = {
        EMOTIONAL: [
            r"(难过|伤心|开心|高兴|生气|焦虑|担心|害怕|激动|失落)",
            r"(心情|感觉|情绪)",
            r"(😭|😢|😊|😃|😄|😁|😆|😅|😂|🤣|😍|🥰|😘|😗|😙|😚|☺️|😌|😔|😕|🙁|😖|😞|😟|😤|😠|😡|🤬|😰|😨|😱)"
        ],
        ADVICE: [
            r"(怎么办|如何|怎样|建议|意见|看法)",
            r"(应该|要不要|是不是|会不会)",
            r"(帮我|告诉我|给我)",
            r"\?"
        ],
        QUERY: [
            r"(什么时候|在哪|谁|什么|哪个|多少)",
            r"(记得|想起|回忆|之前)",
            r"(我.*说过|我.*提到|我.*讲过)"
        ],
        REFLECTION: [
            r"(反思|总结|回顾|复盘)",
            r"(我发现|我觉得|我认为|我想)",
            r"(成长|进步|改变)"
        ]
    }

    def analyze(self, message: str, context: List[Dict] = None) -> str:
        """
        分析对话意图

        Args:
            message: 用户消息
            context: 对话上下文

        Returns:
            意图类型
        """
        # 检查各种模式
        scores = {
            self.EMOTIONAL: self._match_patterns(message, self.PATTERNS[self.EMOTIONAL]),
            self.ADVICE: self._match_patterns(message, self.PATTERNS[self.ADVICE]),
            self.QUERY: self._match_patterns(message, self.PATTERNS[self.QUERY]),
            self.REFLECTION: self._match_patterns(message, self.PATTERNS[self.REFLECTION]),
        }

        # 获取最高分的意图
        max_intent = max(scores, key=scores.get)
        max_score = scores[max_intent]

        # 如果所有得分都很低，默认为闲聊
        if max_score == 0:
            return self.CHAT

        return max_intent

    def _match_patterns(self, text: str, patterns: List[str]) -> int:
        """
        匹配模式并计分

        Args:
            text: 文本
            patterns: 正则模式列表

        Returns:
            匹配得分
        """
        score = 0
        for pattern in patterns:
            if re.search(pattern, text):
                score += 1
        return score


# 全局实例
intent_analyzer = IntentAnalyzer()
