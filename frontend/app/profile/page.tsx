'use client';

import { useEffect, useState } from 'react';
import { Brain, MessageCircle, Sparkles, TrendingUp } from 'lucide-react';
import Navigation from '@/components/Navigation';

interface ProfileData {
  user_id: string;
  tone_style: string;
  common_phrases: string[];
  emoji_usage: number;
  thinking_style: string;
  response_length: string;
  confidence: number;
  sample_count: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // 获取 userId
    const storedUserId = localStorage.getItem('me2_user_id') || '';
    setUserId(storedUserId);

    if (storedUserId) {
      fetchProfile(storedUserId);
    }
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/profile/${uid}`
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('获取画像失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Brain className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500">还没有足够的数据建立你的画像</p>
        <p className="text-sm text-gray-400 mt-2">多聊几句，让我更了解你吧！</p>
      </div>
    );
  }

  const confidencePercent = Math.round(profile.confidence * 100);
  const emojiLevel =
    profile.emoji_usage > 0.6 ? '高' : profile.emoji_usage > 0.3 ? '中' : '低';

  return (
    <>
      <Navigation />
      <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">你的个性画像</h1>
        <p className="text-gray-500">
          Me2 通过 {profile.sample_count} 条消息了解到的你
        </p>
      </div>

      {/* Confidence Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold">画像完整度</span>
          </div>
          <span className="text-2xl font-bold text-blue-600">
            {confidencePercent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {confidencePercent < 30
            ? '刚刚开始了解你'
            : confidencePercent < 70
            ? '逐渐了解你的风格'
            : '已经很了解你了'}
        </p>
      </div>

      {/* Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tone Style */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold">语气风格</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">整体语气</p>
              <p className="text-lg font-medium">{profile.tone_style}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">表情使用</p>
              <p className="text-lg font-medium">{emojiLevel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">回复长度</p>
              <p className="text-lg font-medium">
                {profile.response_length === 'short'
                  ? '简短'
                  : profile.response_length === 'long'
                  ? '详细'
                  : '适中'}
              </p>
            </div>
          </div>
        </div>

        {/* Thinking Style */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold">思维方式</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">思考类型</p>
              <p className="text-lg font-medium">{profile.thinking_style}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">学习样本</p>
              <p className="text-lg font-medium">{profile.sample_count} 条消息</p>
            </div>
          </div>
        </div>

        {/* Common Phrases */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-semibold">常用表达</h2>
          </div>
          {profile.common_phrases.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.common_phrases.slice(0, 15).map((phrase, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  {phrase}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">暂无数据</p>
          )}
        </div>

        {/* Decision Patterns */}
        {profile.decision_patterns && profile.decision_patterns.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold">决策模式</h2>
            </div>
            <ul className="space-y-2">
              {profile.decision_patterns.slice(0, 5).map((pattern, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Values */}
        {profile.value_priorities && Object.keys(profile.value_priorities).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-semibold">价值观</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(profile.value_priorities)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 6)
                .map(([value, priority]) => (
                  <div key={value} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{value}</span>
                        <span className="text-sm text-gray-500">
                          {Math.round((priority as number) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(priority as number) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 小提示</h3>
        <p className="text-sm text-blue-800">
          随着聊天的增加，Me2 会越来越了解你的表达方式和思维习惯，从而更好地模仿你的风格。
        </p>
      </div>
      </div>
    </>
  );
}
