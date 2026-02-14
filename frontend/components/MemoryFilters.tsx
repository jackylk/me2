'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Search, Loader2 } from 'lucide-react';
import { getMemoryTypeName } from '@/lib/utils';

interface MemoryFiltersProps {
  onFilterChange: (filters: { memory_type?: string }) => void;
  onSearch: (query: string) => void;
  isSearching?: boolean;
}

const MEMORY_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'fact', label: '事实' },
  { value: 'event', label: '事件' },
  { value: 'preference', label: '偏好' },
  { value: 'relationship', label: '关系' },
  { value: 'knowledge', label: '知识' },
  { value: 'insight', label: '洞察' },
  { value: 'episodic', label: '情节' },
  { value: 'image', label: '图片' },
];

export default function MemoryFilters({
  onFilterChange,
  onSearch,
  isSearching = false,
}: MemoryFiltersProps) {
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    onFilterChange({ memory_type: type || undefined });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="space-y-4">
      {/* 类型筛选 */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          按类型筛选
        </label>
        <div className="flex flex-wrap gap-2">
          {MEMORY_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeChange(type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 语义搜索 */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          语义搜索
        </label>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索记忆内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
            />
          </div>
          <Button type="submit" disabled={!searchQuery.trim() || isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                搜索中...
              </>
            ) : (
              '搜索'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
