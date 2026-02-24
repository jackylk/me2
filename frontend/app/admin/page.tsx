'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, MessageCircle, Database, MessagesSquare,
  Loader2, RefreshCw, Clock, Cpu, Activity,
  Server, BarChart3,
} from 'lucide-react';
import StatsCard from '@/components/admin/StatsCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const REFRESH_INTERVAL = 30_000;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}天`);
  if (h > 0 || d > 0) parts.push(`${h}时`);
  parts.push(`${m}分`);
  return parts.join(' ');
}

interface HealthData {
  uptime_seconds: number;
  neuromemory_version: string;
  db_pool: { size: number; checked_in: number; checked_out: number; overflow: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const headers = getAuthHeaders();
      const [dashRes, healthRes] = await Promise.allSettled([
        fetch(`${API_BASE}/admin/dashboard`, { headers }),
        fetch(`${API_BASE}/admin/system/health`, { headers }),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.ok)
        setStats(await dashRes.value.json());
      if (healthRes.status === 'fulfilled' && healthRes.value.ok)
        setHealth(await healthRes.value.json());

      setLastRefresh(new Date());
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
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

  const { users, sessions, messages, memories } = stats ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">仪表盘</h1>
        <div className="flex items-center gap-3">
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

      {/* 数据总览 */}
      {stats && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            数据总览
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="用户"
              value={users?.total ?? 0}
              icon={Users}
              trend={[
                { label: '7天活跃', value: users?.active_7d ?? 0 },
                { label: '管理员', value: users?.admin_count ?? 0 },
              ]}
            />
            <StatsCard
              title="会话"
              value={sessions?.total ?? 0}
              icon={MessagesSquare}
              trend={[
                { label: '7天活跃', value: sessions?.active_7d ?? 0 },
              ]}
            />
            <StatsCard
              title="消息"
              value={messages?.total ?? 0}
              icon={MessageCircle}
              trend={[{ label: '近7天', value: messages?.last_7d ?? 0 }]}
            />
            <StatsCard
              title="记忆"
              value={memories?.total ?? 0}
              icon={Database}
              trend={[
                { label: '事实', value: memories?.by_type?.fact || 0 },
                { label: '情景', value: memories?.by_type?.episodic || 0 },
                ...(memories?.graph_nodes > 0 || memories?.graph_edges > 0
                  ? [{ label: '节点/边', value: `${memories.graph_nodes}/${memories.graph_edges}` }]
                  : [{ label: '洞察', value: memories?.by_type?.insight || 0 }]),
              ]}
            />
          </div>
        </section>
      )}

      {/* 服务状态 */}
      {health && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Server className="w-4 h-4" />
            服务状态
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">运行时间</span>
                <Clock className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatUptime(health.uptime_seconds)}
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">NeuroMemory</span>
                <Cpu className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                v{health.neuromemory_version}
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">连接池</span>
                <Database className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {health.db_pool.checked_out}/{health.db_pool.size}
              </div>
              <div className="flex gap-3 mt-2">
                <span className="text-xs text-muted-foreground/50">
                  空闲: <span className="text-foreground/70">{health.db_pool.checked_in}</span>
                </span>
                <span className="text-xs text-muted-foreground/50">
                  溢出: <span className="text-foreground/70">{health.db_pool.overflow}</span>
                </span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">状态</span>
                <Activity className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-2xl font-bold text-green-400">正常</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {!stats && !health && (
        <div className="text-center py-20 text-muted-foreground">
          加载数据失败
        </div>
      )}
    </div>
  );
}
