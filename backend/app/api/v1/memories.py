"""记忆管理 API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from app.dependencies.auth import get_current_user
from app.db.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/memories", tags=["记忆管理"])


class SearchRequest(BaseModel):
    """搜索请求"""
    query: str
    limit: int = 20
    threshold: float = 0.7
    memory_type: Optional[str] = None


class CorrectionRequest(BaseModel):
    """纠正请求"""
    correction: str


class UpdateMemoryRequest(BaseModel):
    """更新记忆请求"""
    content: Optional[str] = None
    memory_type: Optional[str] = None


@router.get("/")
async def get_memories(
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
    memory_type: Optional[str] = None,
):
    """获取记忆列表"""
    try:
        from app.main import nm

        user_id = current_user.id

        # 获取记忆（通过时间范围）
        end_time = datetime.now()
        start_time = end_time - timedelta(days=365)  # 最近一年

        memories = await nm.search(
            user_id=user_id,
            query="*",  # 获取所有
            limit=limit + offset,
            memory_type=memory_type,
        )

        # 简单分页
        paginated = memories[offset : offset + limit]

        return {
            "memories": paginated,
            "total": len(memories),
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"获取记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_memories(
    current_user: User = Depends(get_current_user),
    days: int = 30,
    limit: int = 100,
    memory_type: Optional[str] = None,
):
    """获取最近的记忆"""
    try:
        from app.main import nm

        user_id = current_user.id

        # NeuroMemory v2 的 search 会按相关度和时效性排序
        memories = await nm.search(
            user_id=user_id,
            query="*",
            limit=limit,
            memory_type=memory_type,
        )

        # 过滤最近 N 天的记忆
        cutoff = datetime.now() - timedelta(days=days)
        recent = []
        for m in memories:
            created_at = m.get("created_at") or m.get("timestamp")
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(
                        created_at.replace("Z", "+00:00")
                    )
                if created_at >= cutoff:
                    recent.append(m)

        return {"memories": recent, "days": days}
    except Exception as e:
        logger.error(f"获取最近记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline")
async def get_timeline(
    current_user: User = Depends(get_current_user),
    granularity: str = "day",
    days: int = 30,
):
    """获取时间线"""
    try:
        from app.main import nm
        from collections import defaultdict

        user_id = current_user.id

        # 获取最近记忆
        memories = await nm.search(user_id=user_id, query="*", limit=500)

        # 过滤最近 N 天
        cutoff = datetime.now() - timedelta(days=days)
        recent = []
        for m in memories:
            created_at = m.get("created_at") or m.get("timestamp")
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(
                        created_at.replace("Z", "+00:00")
                    )
                if created_at >= cutoff:
                    m["_parsed_date"] = created_at
                    recent.append(m)

        # 按时间分组
        timeline = defaultdict(list)
        for m in recent:
            date = m["_parsed_date"]
            if granularity == "day":
                key = date.strftime("%Y-%m-%d")
            elif granularity == "week":
                key = f"{date.year}-W{date.isocalendar()[1]}"
            else:  # month
                key = date.strftime("%Y-%m")

            del m["_parsed_date"]
            timeline[key].append(m)

        # 转换为列表格式
        timeline_list = [
            {"date": date, "count": len(mems), "memories": mems}
            for date, mems in sorted(timeline.items(), reverse=True)
        ]

        return {"timeline": timeline_list, "granularity": granularity}
    except Exception as e:
        logger.error(f"获取时间线失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph")
async def get_knowledge_graph(
    current_user: User = Depends(get_current_user),
    limit: int = 100,
):
    """获取知识图谱"""
    try:
        from app.main import nm

        user_id = current_user.id

        # 获取记忆
        memories = await nm.search(user_id=user_id, query="*", limit=limit)

        # 构建简单的图谱（基于关键词共现）
        nodes = []
        edges = []
        keywords_map = {}

        for memory in memories:
            # 提取关键词（简单实现：从 metadata 或内容中提取）
            keywords = []
            if "metadata" in memory and isinstance(memory["metadata"], dict):
                entities = memory["metadata"].get("entities", [])
                if isinstance(entities, list):
                    keywords = [e.get("name") for e in entities if "name" in e]

            # 创建节点
            for kw in keywords[:3]:  # 限制每个记忆最多 3 个关键词
                if kw not in keywords_map:
                    keywords_map[kw] = len(nodes)
                    nodes.append(
                        {
                            "data": {
                                "id": f"node_{len(nodes)}",
                                "label": kw,
                                "type": "entity",
                                "count": 1,
                            }
                        }
                    )
                else:
                    nodes[keywords_map[kw]]["data"]["count"] += 1

            # 创建边（关键词之间的连接）
            for i in range(len(keywords) - 1):
                if keywords[i] in keywords_map and keywords[i + 1] in keywords_map:
                    edges.append(
                        {
                            "data": {
                                "source": f"node_{keywords_map[keywords[i]]}",
                                "target": f"node_{keywords_map[keywords[i+1]]}",
                            }
                        }
                    )

        return {"elements": {"nodes": nodes, "edges": edges}}
    except Exception as e:
        logger.error(f"获取知识图谱失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_memories(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
):
    """语义搜索记忆"""
    try:
        from app.main import nm

        user_id = current_user.id

        memories = await nm.search(
            user_id=user_id,
            query=request.query,
            limit=request.limit,
            memory_type=request.memory_type,
        )

        # 过滤低于阈值的结果
        filtered = [m for m in memories if m.get("score", 0) >= request.threshold]

        return {"memories": filtered, "query": request.query, "count": len(filtered)}
    except Exception as e:
        logger.error(f"搜索记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_memory_stats(
    current_user: User = Depends(get_current_user),
):
    """获取记忆统计信息"""
    try:
        from app.main import nm
        from collections import Counter

        user_id = current_user.id

        # 获取所有记忆
        memories = await nm.search(user_id=user_id, query="*", limit=1000)

        # 统计
        total = len(memories)
        by_type = Counter(m.get("memory_type", "unknown") for m in memories)

        # 最近 7 天
        cutoff = datetime.now() - timedelta(days=7)
        recent_count = 0
        for m in memories:
            created_at = m.get("created_at") or m.get("timestamp")
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(
                        created_at.replace("Z", "+00:00")
                    )
                if created_at >= cutoff:
                    recent_count += 1

        return {
            "total": total,
            "by_type": dict(by_type),
            "recent_7_days_total": recent_count,
            "avg_per_day": round(recent_count / 7, 1) if recent_count > 0 else 0,
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{memory_id}")
async def update_memory(
    memory_id: str,
    request: UpdateMemoryRequest,
    current_user: User = Depends(get_current_user),
):
    """更新记忆"""
    try:
        from app.main import nm

        user_id = current_user.id

        # NeuroMemory v2 不支持直接更新，需要标记删除并添加新记忆
        # 这里简化实现：添加纠正记忆
        correction_text = f"更新记忆 {memory_id}: "
        if request.content:
            correction_text += f"内容更改为: {request.content}"
        if request.memory_type:
            correction_text += f" 类型更改为: {request.memory_type}"

        result = await nm.add(
            user_id=user_id,
            content=correction_text,
            memory_type="correction",
            metadata={
                "is_deletion_marker": True,
                "target_memory_id": memory_id,
                "updated_content": request.content,
                "updated_type": request.memory_type,
            },
        )

        return {"success": True, "message": "记忆已更新", "correction_id": result.get("id")}
    except Exception as e:
        logger.error(f"更新记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
):
    """删除记忆（标记删除）"""
    try:
        from app.main import nm

        user_id = current_user.id

        # NeuroMemory v2 不支持物理删除，使用标记删除
        result = await nm.add(
            user_id=user_id,
            content=f"删除记忆: {memory_id}",
            memory_type="correction",
            metadata={"is_deletion_marker": True, "target_memory_id": memory_id},
        )

        return {"success": True, "message": "记忆已标记删除"}
    except Exception as e:
        logger.error(f"删除记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/correct")
async def conversational_correct(
    request: CorrectionRequest,
    current_user: User = Depends(get_current_user),
):
    """对话式纠正"""
    try:
        from app.main import nm
        from app.services.llm_client import LLMClient

        user_id = current_user.id
        llm = LLMClient()

        # 使用 LLM 理解纠正意图
        prompt = f"""用户说："{request.correction}"

请分析这句话，提取以下信息（JSON 格式）：
- old_value: 旧的错误值
- new_value: 新的正确值
- entity_type: 实体类型（人物、地点、偏好等）
- search_query: 用于搜索相关记忆的查询词

只返回 JSON，不要其他内容。"""

        response = await llm.generate(prompt=prompt, temperature=0.3, max_tokens=200)

        # 解析 LLM 响应
        import json

        try:
            correction_info = json.loads(response.strip())
        except:
            # 如果解析失败，使用简单规则
            correction_info = {
                "old_value": "",
                "new_value": request.correction,
                "entity_type": "信息",
                "search_query": request.correction,
            }

        # 搜索相关记忆
        search_query = correction_info.get("search_query", request.correction)
        related = await nm.search(user_id=user_id, query=search_query, limit=10)

        # 添加纠正记忆
        await nm.add(
            user_id=user_id,
            content=request.correction,
            memory_type="correction",
            metadata={
                "correction_info": correction_info,
                "affected_memories": [m.get("id") for m in related[:5]],
            },
        )

        return {
            "success": True,
            "message": "纠正已记录",
            "affected_memories": len(related),
            "correction_info": correction_info,
        }
    except Exception as e:
        logger.error(f"对话式纠正失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{memory_id}")
async def get_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
):
    """获取单个记忆详情"""
    try:
        from app.main import nm

        user_id = current_user.id

        # 通过 ID 搜索
        memories = await nm.search(
            user_id=user_id, query=memory_id, limit=100
        )

        # 查找匹配的记忆
        for memory in memories:
            if memory.get("id") == memory_id:
                return memory

        raise HTTPException(status_code=404, detail="记忆不存在")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取记忆详情失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
