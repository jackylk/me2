'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import {
  formatRelativeTime,
  getMemoryTypeColor,
  getMemoryTypeName,
  truncate,
} from '@/lib/utils';

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  timestamp?: string;
  created_at?: string;
  metadata?: Record<string, any>;
  score?: number;
  access_count?: number;
}

interface MemoryCardProps {
  memory: Memory;
  onClick?: () => void;
}

export default function MemoryCard({ memory, onClick }: MemoryCardProps) {
  const typeColor = getMemoryTypeColor(memory.memory_type);
  const typeName = getMemoryTypeName(memory.memory_type);
  const timestamp = memory.timestamp || memory.created_at;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // 默认行为：跳转到详情页
      window.location.href = `/memories/${memory.id}`;
    }
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col"
      onClick={handleClick}
    >
      <CardContent className="pt-6 flex-1">
        {/* 头部：类型 + 时间 */}
        <div className="flex items-start justify-between mb-3">
          <Badge variant={typeColor}>{typeName}</Badge>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(timestamp)}
            </span>
          )}
        </div>

        {/* 图片缩略图 */}
        {memory.metadata?.is_image && memory.metadata?.thumbnail_url && (
          <div className="mb-3">
            <img
              src={
                memory.metadata.thumbnail_url || memory.metadata.image_url
              }
              alt={memory.content}
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}

        {/* 内容 */}
        <p className="text-sm text-foreground leading-relaxed">
          {truncate(memory.content, 150)}
        </p>

        {/* 相关度分数 */}
        {memory.score !== undefined && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">
              相关度: {(memory.score * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </CardContent>

      {/* 底部：ID + 访问次数 */}
      <CardFooter className="text-xs text-muted-foreground flex justify-between">
        <span>ID: {memory.id.slice(0, 8)}...</span>
        {memory.access_count !== undefined && (
          <span>访问: {memory.access_count}x</span>
        )}
      </CardFooter>
    </Card>
  );
}
