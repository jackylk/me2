'use client';

import { useEffect, useState } from 'react';
import { Bell, Calendar, Heart, MessageCircle, CheckCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';

interface ProactiveHistory {
  contact_id: string;
  message: string;
  trigger_type: string;
  trigger_reason: string;
  message_type: string;
  is_sent: boolean;
  is_replied: boolean;
  created_at: string;
  sent_at?: string;
  replied_at?: string;
}

export default function ProactivePage() {
  const [history, setHistory] = useState<ProactiveHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const storedUserId = localStorage.getItem('me2_user_id') || '';
    setUserId(storedUserId);

    if (storedUserId) {
      fetchHistory(storedUserId);
    }
  }, []);

  const fetchHistory = async (uid: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/proactive/history/${uid}`
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('获取历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      time: <Calendar className="w-5 h-5 text-blue-500" />,
      event: <Bell className="w-5 h-5 text-purple-500" />,
      context: <Heart className="w-5 h-5 text-green-500" />,
    };

    return icons[type] || <MessageCircle className="w-5 h-5 text-gray-500" />;
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      time: { label: '定时问候', color: 'bg-blue-100 text-blue-700' },
      event: { label: '事件提醒', color: 'bg-purple-100 text-purple-700' },
      context: { label: '主动关心', color: 'bg-green-100 text-green-700' },
    };

    const badge = badges[type] || { label: '其他', color: 'bg-gray-100 text-gray-700' };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">加载中...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">主动关心记录</h1>
        <p className="text-gray-500 mb-8">
          Me2 主动关心你的历史记录
        </p>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总消息数</p>
                <p className="text-2xl font-bold">{history.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已回复</p>
                <p className="text-2xl font-bold">
                  {history.filter((h) => h.is_replied).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Heart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">关心指数</p>
                <p className="text-2xl font-bold">
                  {history.length > 0 ? Math.round((history.filter((h) => h.is_replied).length / history.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">还没有主动关心记录</p>
              <p className="text-sm text-gray-400 mt-2">
                Me2 会在合适的时机主动关心你
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.contact_id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{getTypeIcon(item.trigger_type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(item.trigger_type)}
                      {item.is_replied && (
                        <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium">
                          已回复
                        </span>
                      )}
                    </div>

                    <p className="text-gray-900 mb-2">{item.message}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📅 {formatTime(item.created_at)}</span>
                      {item.trigger_reason && (
                        <span className="text-xs">原因: {item.trigger_reason}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 关于主动关心</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Me2 会在合适的时机主动关心你</li>
            <li>• 长时间未联系、情绪低落、重要事件时会触发</li>
            <li>• 每天早晨和晚间也可能会问候你</li>
            <li>• 你可以随时回复，Me2 会记录你的反馈</li>
          </ul>
        </div>
      </div>
    </>
  );
}
