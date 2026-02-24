'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  MessagesSquare,
  MessageCircle,
  Database,
  Mail,
  CalendarDays,
  Clock,
} from 'lucide-react';
import StatsCard from '@/components/admin/StatsCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SessionItem {
  id: string;
  title: string;
  created_at: string | null;
  last_active_at: string | null;
  message_count: number;
  is_active: boolean;
}

interface UserDetail {
  id: string;
  username: string;
  email: string | null;
  is_admin: boolean;
  created_at: string | null;
  last_login: string | null;
  session_count: number;
  message_count: number;
  memory_count: number;
  recent_sessions: SessionItem[];
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/users/${params.id}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          setError(res.status === 404 ? '用户不存在' : '加载用户信息失败');
          return;
        }
        setData(await res.json());
      } catch (e) {
        console.error('Failed to load user detail:', e);
        setError('加载用户信息失败');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/users')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回用户列表
        </button>
        <div className="text-muted-foreground">{error || '加载用户信息失败'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/admin/users')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回用户列表
      </button>

      {/* 用户信息 */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {data.username}
              </h1>
              {data.is_admin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/15 text-primary shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  管理员
                </span>
              )}
            </div>
            {data.email && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                {data.email}
              </div>
            )}
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground shrink-0">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>注册于 {formatDate(data.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>最后活跃 {formatDateTime(data.last_login)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="会话"
          value={data.session_count ?? 0}
          icon={MessagesSquare}
        />
        <StatsCard
          title="消息"
          value={data.message_count ?? 0}
          icon={MessageCircle}
        />
        <StatsCard
          title="记忆"
          value={data.memory_count ?? 0}
          icon={Database}
        />
      </div>

      {/* 最近会话 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-foreground">最近会话</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">标题</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">最后活跃</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">消息数</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent_sessions ?? []).map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-foreground">
                    {session.title || '未命名'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(session.last_active_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    {session.message_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {session.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
                        活跃
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-muted-foreground">
                        不活跃
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(!data.recent_sessions || data.recent_sessions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    暂无会话
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
