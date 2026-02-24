'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, RefreshCw, Clock, Zap, AlertTriangle, BarChart3, Brain, Hash,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const REFRESH_INTERVAL = 30_000;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function formatNumber(n: number): string {
  return (n ?? 0).toLocaleString();
}

const TIME_RANGES = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
];

interface LlmStatsData {
  total_calls: number;
  today_calls: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  avg_duration_ms: number;
  failure_rate: number;
}

interface EmbeddingStatsData {
  total_calls: number;
  today_calls: number;
  total_texts: number;
  avg_duration_ms: number;
  failure_rate: number;
}

interface ApiStatsData {
  total_requests: number;
  error_count: number;
  endpoints: Record<string, { count: number; avg_ms: number; p95_ms: number }>;
}

export default function UsagePage() {
  const [hours, setHours] = useState(24);
  const [llmStats, setLlmStats] = useState<LlmStatsData | null>(null);
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStatsData | null>(null);
  const [apiStats, setApiStats] = useState<ApiStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const headers = getAuthHeaders();
      const [llmRes, embRes, apiRes] = await Promise.allSettled([
        fetch(`${API_BASE}/admin/system/llm-stats?hours=${hours}`, { headers }),
        fetch(`${API_BASE}/admin/system/embedding-stats?hours=${hours}`, { headers }),
        fetch(`${API_BASE}/admin/system/api-stats?hours=${hours}`, { headers }),
      ]);

      if (llmRes.status === 'fulfilled' && llmRes.value.ok)
        setLlmStats(await llmRes.value.json());
      if (embRes.status === 'fulfilled' && embRes.value.ok)
        setEmbeddingStats(await embRes.value.json());
      if (apiRes.status === 'fulfilled' && apiRes.value.ok)
        setApiStats(await apiRes.value.json());

      setLastRefresh(new Date());
    } catch (e) {
      console.error('Failed to load usage stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hours]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
    const timer = setInterval(() => fetchAll(), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">用量统计</h1>
        <div className="flex items-center gap-3">
          {/* 时间范围选择 */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            {TIME_RANGES.map(({ label, hours: h }) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  hours === h
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {lastRefresh && (
            <span className="text-xs text-muted-foreground/50">
              更新于 {lastRefresh.toLocaleTimeString('zh-CN')}
            </span>
          )}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* LLM 用量 */}
      {llmStats && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Brain className="w-4 h-4" />
            LLM 用量
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">调用次数</span>
                <Zap className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(llmStats.total_calls)}
              </div>
              <div className="text-xs text-muted-foreground/50 mt-1">
                今天: <span className="text-foreground/70">{formatNumber(llmStats.today_calls)}</span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Token 用量</span>
                <BarChart3 className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber((llmStats.total_prompt_tokens || 0) + (llmStats.total_completion_tokens || 0))}
              </div>
              <div className="flex gap-3 mt-2">
                <span className="text-xs text-muted-foreground/50">
                  输入: <span className="text-foreground/70">{formatNumber(llmStats.total_prompt_tokens)}</span>
                </span>
                <span className="text-xs text-muted-foreground/50">
                  输出: <span className="text-foreground/70">{formatNumber(llmStats.total_completion_tokens)}</span>
                </span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">平均耗时</span>
                <Clock className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {(llmStats.avg_duration_ms ?? 0).toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">失败率</span>
                <AlertTriangle className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className={`text-2xl font-bold ${(llmStats.failure_rate ?? 0) > 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                {((llmStats.failure_rate ?? 0) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Embedding 用量 */}
      {embeddingStats && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Embedding 用量
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">调用次数</span>
                <Zap className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(embeddingStats.total_calls)}
              </div>
              <div className="text-xs text-muted-foreground/50 mt-1">
                今天: <span className="text-foreground/70">{formatNumber(embeddingStats.today_calls)}</span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">处理文本数</span>
                <BarChart3 className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(embeddingStats.total_texts)}
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">平均耗时</span>
                <Clock className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {(embeddingStats.avg_duration_ms ?? 0).toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">失败率</span>
                <AlertTriangle className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className={`text-2xl font-bold ${(embeddingStats.failure_rate ?? 0) > 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                {((embeddingStats.failure_rate ?? 0) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </section>
      )}

      {/* API 性能 */}
      {apiStats && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="w-4 h-4" />
            API 性能
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">总请求</span>
                <Zap className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(apiStats.total_requests)}
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">错误</span>
                <AlertTriangle className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(apiStats.error_count)}
              </div>
              {apiStats.total_requests > 0 && (
                <div className="text-xs text-muted-foreground/50 mt-1">
                  错误率 {((apiStats.error_count / apiStats.total_requests) * 100).toFixed(2)}%
                </div>
              )}
            </div>
          </div>

          {apiStats.endpoints && Object.keys(apiStats.endpoints).length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">接口</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">次数</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">平均 (ms)</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">P95 (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(apiStats.endpoints)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([endpoint, s]) => (
                        <tr key={endpoint} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{endpoint}</td>
                          <td className="px-4 py-3 text-right text-foreground tabular-nums">{formatNumber(s.count)}</td>
                          <td className="px-4 py-3 text-right text-foreground tabular-nums">{s.avg_ms?.toFixed(1) ?? '-'}</td>
                          <td className="px-4 py-3 text-right text-foreground tabular-nums">{s.p95_ms?.toFixed(1) ?? '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {!llmStats && !embeddingStats && !apiStats && (
        <div className="text-center py-20 text-muted-foreground">
          加载数据失败
        </div>
      )}
    </div>
  );
}
