'use client';

import { useEffect, useState } from 'react';
import {
  Network,
  List,
  Clock,
  Search as SearchIcon,
  TrendingUp,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import MemoryGraph from '@/components/MemoryGraph';
import MemoryList from '@/components/MemoryList';
import MemoryTimeline from '@/components/MemoryTimeline';

type ViewMode = 'graph' | 'list' | 'timeline';

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  timestamp: string;
  metadata?: Record<string, any>;
  score?: number;
}

interface TimelineGroup {
  date: string;
  count: number;
  memories: Memory[];
}

interface GraphElements {
  nodes: Array<{ data: any }>;
  edges: Array<{ data: any }>;
}

export default function MemoriesPage() {
  const [userId, setUserId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [timeline, setTimeline] = useState<TimelineGroup[]>([]);
  const [graphElements, setGraphElements] = useState<GraphElements>({
    nodes: [],
    edges: [],
  });
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [searching, setSearching] = useState(false);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [correctionInput, setCorrectionInput] = useState('');
  const [correcting, setCorrecting] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem('me2_user_id') || '';
    setUserId(storedUserId);
    if (storedUserId) {
      loadData(storedUserId);
    }
  }, []);

  const loadData = async (uid: string) => {
    setLoading(true);
    try {
      await Promise.all([
        loadMemories(uid),
        loadStats(uid),
        loadGraph(uid),
      ]);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemories = async (uid: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/memories/${uid}/recent?days=30&limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('加载记忆失败:', error);
    }
  };

  const loadStats = async (uid: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/memories/${uid}/stats`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const loadTimeline = async (uid: string, gran: 'day' | 'week' | 'month') => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/memories/${uid}/timeline?granularity=${gran}&days=30`
      );
      if (response.ok) {
        const data = await response.json();
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      console.error('加载时间线失败:', error);
    }
  };

  const loadGraph = async (uid: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/memories/${uid}/graph?limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        setGraphElements(data.elements || { nodes: [], edges: [] });
      }
    } catch (error) {
      console.error('加载图谱失败:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userId) return;

    setSearching(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/memories/${userId}/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            limit: 20,
            threshold: 0.7,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.memories || []);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleCorrection = async () => {
    if (!correctionInput.trim() || !userId) return;

    setCorrecting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/memories/${userId}/correct`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correction: correctionInput }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(data.message || '纠正成功');
        setCorrectionInput('');
        loadMemories(userId);
      }
    } catch (error) {
      console.error('纠正失败:', error);
      alert('纠正失败，请稍后重试');
    } finally {
      setCorrecting(false);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'timeline' && timeline.length === 0) {
      loadTimeline(userId, granularity);
    }
  };

  const handleGranularityChange = (gran: 'day' | 'week' | 'month') => {
    setGranularity(gran);
    loadTimeline(userId, gran);
  };

  const handleNodeClick = (nodeData: any) => {
    // 点击节点时搜索相关记忆
    setSearchQuery(nodeData.label);
    handleSearch();
  };

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">记忆管理</h1>
        <p className="text-gray-500 mb-6">查看、管理和探索你的记忆</p>

        {/* 统计面板 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-gray-500">总记忆数</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.recent_7_days_total}</div>
                  <div className="text-sm text-gray-500">最近 7 天</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.avg_per_day}</div>
                  <div className="text-sm text-gray-500">日均记忆</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Network className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {Object.keys(stats.by_type || {}).length}
                  </div>
                  <div className="text-sm text-gray-500">记忆类型</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 搜索和纠正 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 语义搜索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                语义搜索
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索记忆..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <SearchIcon className="w-4 h-4" />
                  )}
                  搜索
                </button>
              </div>
            </div>

            {/* 对话式纠正 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                对话式纠正
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={correctionInput}
                  onChange={(e) => setCorrectionInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCorrection()}
                  placeholder='例如："我女儿不叫灿灿，叫小灿"'
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleCorrection}
                  disabled={correcting || !correctionInput.trim()}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {correcting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  纠正
                </button>
              </div>
            </div>
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-3">
                搜索结果 ({searchResults.length} 条)
              </div>
              <MemoryList memories={searchResults} showSearch={false} />
            </div>
          )}
        </div>

        {/* 视图切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleViewModeChange('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <List className="w-4 h-4" />
            列表视图
          </button>
          <button
            onClick={() => handleViewModeChange('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'timeline'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            时间线
          </button>
          <button
            onClick={() => handleViewModeChange('graph')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'graph'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Network className="w-4 h-4" />
            知识图谱
          </button>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {viewMode === 'list' && <MemoryList memories={memories} />}

              {viewMode === 'timeline' && (
                <MemoryTimeline
                  timeline={timeline}
                  granularity={granularity}
                  onGranularityChange={handleGranularityChange}
                />
              )}

              {viewMode === 'graph' && (
                <div className="h-[600px]">
                  <MemoryGraph
                    elements={graphElements}
                    onNodeClick={handleNodeClick}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* 提示 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>列表视图</strong>: 查看所有记忆，支持筛选和编辑</li>
            <li>
              • <strong>时间线</strong>: 按时间顺序查看记忆，支持按日/周/月分组
            </li>
            <li>
              • <strong>知识图谱</strong>: 可视化展示记忆之间的关系，点击节点查看相关记忆
            </li>
            <li>
              • <strong>语义搜索</strong>: 使用自然语言搜索相关记忆，无需精确匹配
            </li>
            <li>
              • <strong>对话式纠正</strong>: 用自然语言纠正错误的记忆，系统会自动理解并更新
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
