'use client';

import { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface TimelineGroup {
  date: string;
  count: number;
  memories: Memory[];
}

interface MemoryTimelineProps {
  timeline: TimelineGroup[];
  granularity?: 'day' | 'week' | 'month';
  onGranularityChange?: (granularity: 'day' | 'week' | 'month') => void;
}

export default function MemoryTimeline({
  timeline,
  granularity = 'day',
  onGranularityChange,
}: MemoryTimelineProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const formatDate = (dateStr: string) => {
    if (granularity === 'week') {
      // Format: 2024-W12
      const [year, week] = dateStr.split('-W');
      return `${year} 年第 ${week} 周`;
    } else if (granularity === 'month') {
      // Format: 2024-01
      const [year, month] = dateStr.split('-');
      return `${year} 年 ${month} 月`;
    } else {
      // Format: 2024-01-15
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (dateStr === today.toISOString().split('T')[0]) {
        return '今天';
      } else if (dateStr === yesterday.toISOString().split('T')[0]) {
        return '昨天';
      } else {
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });
      }
    }
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      fact: '事实',
      episodic: '情节',
      insight: '洞察',
      general: '通用',
    };
    return names[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fact: 'text-blue-600',
      episodic: 'text-green-600',
      insight: 'text-orange-600',
      general: 'text-gray-600',
    };
    return colors[type] || 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      {/* 粒度选择 */}
      {onGranularityChange && (
        <div className="flex gap-2">
          <button
            onClick={() => onGranularityChange('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              granularity === 'day'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            按日
          </button>
          <button
            onClick={() => onGranularityChange('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              granularity === 'week'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            按周
          </button>
          <button
            onClick={() => onGranularityChange('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              granularity === 'month'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            按月
          </button>
        </div>
      )}

      {/* 时间线 */}
      <div className="relative">
        {/* 垂直线 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* 时间点 */}
        <div className="space-y-6">
          {timeline.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              没有记忆数据
            </div>
          ) : (
            timeline.map((group) => {
              const isExpanded = expandedDates.has(group.date);

              return (
                <div key={group.date} className="relative pl-12">
                  {/* 时间点标记 */}
                  <div className="absolute left-0 top-0 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                      {group.count}
                    </div>
                  </div>

                  {/* 内容卡片 */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* 日期头部 */}
                    <button
                      onClick={() => toggleExpand(group.date)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {formatDate(group.date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {group.count} 条记忆
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {/* 展开的记忆列表 */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="space-y-3">
                          {group.memories.map((memory) => (
                            <div
                              key={memory.id}
                              className="bg-white rounded-lg p-3 border border-gray-100"
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <span
                                  className={`text-xs font-medium ${getTypeColor(
                                    memory.memory_type
                                  )}`}
                                >
                                  {getTypeName(memory.memory_type)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(memory.timestamp).toLocaleTimeString(
                                    'zh-CN',
                                    {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )}
                                </span>
                              </div>
                              <div className="text-sm text-gray-800">
                                {memory.content.length > 150
                                  ? memory.content.slice(0, 150) + '...'
                                  : memory.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 统计 */}
      {timeline.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          共 {timeline.length} 个时间节点，
          {timeline.reduce((sum, g) => sum + g.count, 0)} 条记忆
        </div>
      )}
    </div>
  );
}
