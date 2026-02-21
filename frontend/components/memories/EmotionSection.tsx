'use client';

import { useEffect, useState } from 'react';
import { Loader2, Heart, TrendingUp, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

interface EmotionData {
  meso: {
    state: string | null;
    period: string | null;
    valence: number | null;
    arousal: number | null;
    updated_at: string | null;
  };
  macro: {
    valence_avg: number | null;
    arousal_avg: number | null;
    dominant_emotions: Record<string, number> | null;
    emotion_triggers: Record<string, any> | null;
  };
  source_count: number | null;
}

function ValenceBar({ value, label }: { value: number | null; label: string }) {
  if (value === null || value === undefined) return null;
  // valence: -1 to 1, map to 0-100%
  const pct = ((value + 1) / 2) * 100;
  const color =
    value > 0.3
      ? 'bg-green-500'
      : value > -0.3
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>-1</span>
        <span>0</span>
        <span>+1</span>
      </div>
    </div>
  );
}

function ArousalBar({ value, label }: { value: number | null; label: string }) {
  if (value === null || value === undefined) return null;
  // arousal: 0 to 1
  const pct = value * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>0</span>
        <span>0.5</span>
        <span>1</span>
      </div>
    </div>
  );
}

export default function EmotionSection() {
  const [emotion, setEmotion] = useState<EmotionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmotion();
  }, []);

  const loadEmotion = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/memories/emotion`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setEmotion(data.emotion);
      }
    } catch (error) {
      console.error('加载情绪档案失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!emotion) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <Heart className="w-12 h-12 mb-3 opacity-50" />
        <p>暂无情绪档案数据</p>
        <p className="text-sm mt-1">多聊几次天后，系统会自动分析你的情绪状态</p>
      </div>
    );
  }

  const { meso, macro } = emotion;
  const dominantEmotions = macro.dominant_emotions || {};
  const emotionTriggers = macro.emotion_triggers || {};
  const maxEmotionValue = Math.max(...Object.values(dominantEmotions), 0.01);

  return (
    <div className="p-6 space-y-8">
      {/* Meso: 近期情绪 */}
      <div>
        <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          近期情绪状态
        </h3>

        {meso.state ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
            <p className="text-gray-800 dark:text-gray-200 mb-4">{meso.state}</p>

            {meso.period && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                周期: {meso.period}
                {meso.updated_at && (
                  <> &middot; 更新于 {new Date(meso.updated_at).toLocaleDateString('zh-CN')}</>
                )}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ValenceBar value={meso.valence} label="情感倾向 (Valence)" />
              <ArousalBar value={meso.arousal} label="情绪强度 (Arousal)" />
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            近期情绪状态尚未生成
          </div>
        )}
      </div>

      {/* Macro: 长期情绪特征 */}
      <div>
        <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5" />
          长期情绪特征
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 长期均值 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              长期均值
            </h4>
            <ValenceBar value={macro.valence_avg} label="平均情感倾向" />
            <ArousalBar value={macro.arousal_avg} label="平均情绪强度" />
          </div>

          {/* 主导情绪 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              主导情绪
            </h4>
            {Object.keys(dominantEmotions).length === 0 ? (
              <p className="text-sm text-gray-400">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(dominantEmotions)
                  .sort(([, a], [, b]) => b - a)
                  .map(([emotion, value]) => (
                    <div key={emotion}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700 dark:text-gray-300">{emotion}</span>
                        <span className="text-gray-500">{(value * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(value / maxEmotionValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* 情绪触发器 */}
        {Object.keys(emotionTriggers).length > 0 && (
          <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              情绪触发因素
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(emotionTriggers).map(([trigger, data]: [string, any]) => {
                const valence = typeof data === 'object' ? data.valence : data;
                const color =
                  valence > 0
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : valence < 0
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800';

                return (
                  <div
                    key={trigger}
                    className={`border rounded-lg px-3 py-2 ${color}`}
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {trigger}
                    </span>
                    {valence !== undefined && (
                      <span className="ml-2 text-xs text-gray-500">
                        {valence > 0 ? '+' : ''}
                        {typeof valence === 'number' ? valence.toFixed(2) : valence}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 来源信息 */}
      {emotion.source_count !== null && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
          基于 {emotion.source_count} 条记忆分析
        </p>
      )}
    </div>
  );
}
