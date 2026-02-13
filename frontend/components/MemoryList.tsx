'use client';

import { useState } from 'react';
import {
  Trash2,
  Edit,
  Calendar,
  Tag,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  timestamp: string;
  metadata?: Record<string, any>;
  score?: number;
}

interface MemoryListProps {
  memories: Memory[];
  onEdit?: (memory: Memory) => void;
  onDelete?: (memoryId: string) => void;
  showSearch?: boolean;
}

export default function MemoryList({
  memories,
  onEdit,
  onDelete,
  showSearch = true,
}: MemoryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 获取所有类型
  const types = Array.from(new Set(memories.map((m) => m.memory_type)));

  // 筛选记忆
  const filteredMemories = memories.filter((memory) => {
    const matchesSearch =
      searchQuery === '' ||
      memory.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedType === 'all' || memory.memory_type === selectedType;
    return matchesSearch && matchesType;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days} 天前`;
    } else if (days < 30) {
      return `${Math.floor(days / 7)} 周前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fact: 'bg-blue-100 text-blue-800',
      event: 'bg-green-100 text-green-800',
      preference: 'bg-purple-100 text-purple-800',
      relationship: 'bg-pink-100 text-pink-800',
      knowledge: 'bg-yellow-100 text-yellow-800',
      correction: 'bg-red-100 text-red-800',
      image: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      fact: '事实',
      event: '事件',
      preference: '偏好',
      relationship: '关系',
      knowledge: '知识',
      correction: '纠正',
      image: '图片',
    };
    return names[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      {showSearch && (
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索记忆..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部类型</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {getTypeName(type)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 记忆列表 */}
      <div className="space-y-3">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || selectedType !== 'all'
              ? '没有找到匹配的记忆'
              : '还没有记忆'}
          </div>
        ) : (
          filteredMemories.map((memory) => {
            const isExpanded = expandedIds.has(memory.id);
            const contentPreview =
              memory.content.length > 100
                ? memory.content.slice(0, 100) + '...'
                : memory.content;

            return (
              <div
                key={memory.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(
                        memory.memory_type
                      )}`}
                    >
                      {getTypeName(memory.memory_type)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(memory.timestamp)}
                    </span>
                    {memory.score && (
                      <span className="text-xs text-gray-500">
                        相关度: {(memory.score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(memory)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(memory.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 图片（如果有） */}
                {memory.metadata?.is_image && memory.metadata?.thumbnail_url && (
                  <div className="mb-3">
                    <img
                      src={memory.metadata.thumbnail_url || memory.metadata.image_url}
                      alt={memory.content}
                      className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(memory.metadata.image_url, '_blank');
                      }}
                    />
                  </div>
                )}

                {/* 内容 */}
                <div className="text-gray-800 mb-2">
                  {isExpanded ? memory.content : contentPreview}
                </div>

                {/* 展开/收起按钮 */}
                {memory.content.length > 100 && (
                  <button
                    onClick={() => toggleExpand(memory.id)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        展开
                      </>
                    )}
                  </button>
                )}

                {/* Metadata */}
                {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Tag className="w-3 h-3" />
                      <span>元数据:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(memory.metadata)
                        .filter(
                          ([key]) =>
                            !key.startsWith('_') && key !== 'is_deletion_marker'
                        )
                        .slice(0, 5)
                        .map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-gray-50 rounded text-xs text-gray-600"
                          >
                            {key}:{' '}
                            {typeof value === 'object'
                              ? JSON.stringify(value).slice(0, 20)
                              : String(value).slice(0, 20)}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 统计 */}
      {filteredMemories.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          显示 {filteredMemories.length} 条记忆
          {searchQuery || selectedType !== 'all'
            ? ` (共 ${memories.length} 条)`
            : ''}
        </div>
      )}
    </div>
  );
}
