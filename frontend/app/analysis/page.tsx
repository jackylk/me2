'use client';

import { useEffect, useState } from 'react';
import { Brain, Sparkles, TrendingUp, Target, Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';

interface DeepAnalysis {
  thinking_depth: string;
  logic_level: string;
  abstraction: string;
  emotion_expression: string;
  self_reflection: string;
  key_insights: string[];
}

export default function AnalysisPage() {
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DeepAnalysis | null>(null);
  const [error, setError] = useState<string>('');
  const [learningValues, setLearningValues] = useState(false);
  const [learningDecisions, setLearningDecisions] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem('me2_user_id') || '';
    setUserId(storedUserId);
  }, []);

  const handleDeepAnalyze = async () => {
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/deep-analysis/${userId}/deep-analyze`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '分析失败');
      }
    } catch (error) {
      console.error('深度分析失败:', error);
      setError('分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLearnValues = async () => {
    if (!userId) return;

    setLearningValues(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/deep-analysis/${userId}/values`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days: 90 }),
        }
      );

      if (response.ok) {
        alert('价值观学习任务已启动，将在后台运行');
      }
    } catch (error) {
      console.error('启动价值观学习失败:', error);
    } finally {
      setLearningValues(false);
    }
  };

  const handleLearnDecisions = async () => {
    if (!userId) return;

    setLearningDecisions(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/deep-analysis/${userId}/decision-patterns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days: 30 }),
        }
      );

      if (response.ok) {
        alert('决策模式学习任务已启动，将在后台运行');
      }
    } catch (error) {
      console.error('启动决策模式学习失败:', error);
    } finally {
      setLearningDecisions(false);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      深入: 'text-green-600 bg-green-100',
      适中: 'text-blue-600 bg-blue-100',
      表面: 'text-gray-600 bg-gray-100',
      强: 'text-green-600 bg-green-100',
      中: 'text-blue-600 bg-blue-100',
      弱: 'text-gray-600 bg-gray-100',
      高: 'text-green-600 bg-green-100',
      低: 'text-gray-600 bg-gray-100',
      经常: 'text-green-600 bg-green-100',
      偶尔: 'text-blue-600 bg-blue-100',
      很少: 'text-gray-600 bg-gray-100',
    };

    return colors[level] || 'text-gray-600 bg-gray-100';
  };

  return (
    <>
      <Navigation />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">深度思维分析</h1>
        <p className="text-gray-500 mb-8">
          深入了解你的思维方式和价值观
        </p>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={handleDeepAnalyze}
            disabled={loading || !userId}
            className="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-lg px-6 py-3 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                深度分析
              </>
            )}
          </button>

          <button
            onClick={handleLearnValues}
            disabled={learningValues || !userId}
            className="flex items-center justify-center gap-2 bg-purple-500 text-white rounded-lg px-6 py-3 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {learningValues ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                启动中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                学习价值观
              </>
            )}
          </button>

          <button
            onClick={handleLearnDecisions}
            disabled={learningDecisions || !userId}
            className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-lg px-6 py-3 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {learningDecisions ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                启动中...
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                学习决策模式
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Dimensions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">思维维度分析</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">思考深度</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(
                      analysis.thinking_depth
                    )}`}
                  >
                    {analysis.thinking_depth}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">逻辑性</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(
                      analysis.logic_level
                    )}`}
                  >
                    {analysis.logic_level}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">抽象能力</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(
                      analysis.abstraction
                    )}`}
                  >
                    {analysis.abstraction}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">情感表达</span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    {analysis.emotion_expression}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg md:col-span-2">
                  <span className="text-gray-700">自我反思</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(
                      analysis.self_reflection
                    )}`}
                  >
                    {analysis.self_reflection}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            {analysis.key_insights && analysis.key_insights.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">关键洞察</h2>
                <ul className="space-y-3">
                  {analysis.key_insights.map((insight, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                    >
                      <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-800">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>深度分析</strong>: 基于最近的对话分析你的思维特征</li>
            <li>• <strong>学习价值观</strong>: 从长期对话中提取核心价值观（后台任务）</li>
            <li>• <strong>学习决策模式</strong>: 分析你的决策习惯和风格（后台任务）</li>
            <li>• 分析结果会自动更新到你的个性画像中</li>
          </ul>
        </div>
      </div>
    </>
  );
}
