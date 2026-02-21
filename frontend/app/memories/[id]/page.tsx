'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  formatDate,
  formatRelativeTime,
  getMemoryTypeColor,
  getMemoryTypeName,
} from '@/lib/utils';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
  Calendar,
  Hash,
  Tag,
  User,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  created_at?: string;
  timestamp?: string;
  updated_at?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  access_count?: number;
  last_accessed_at?: string;
  score?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
}

export default function MemoryDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedType, setEditedType] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMemory();
  }, [id]);

  const loadMemory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/memories/${id}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error('记忆不存在或加载失败');
      }

      const data = await response.json();
      setMemory(data);
      setEditedContent(data.content);
      setEditedType(data.memory_type);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!memory) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE}/memories/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            content: editedContent !== memory.content ? editedContent : undefined,
            memory_type: editedType !== memory.memory_type ? editedType : undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('更新失败');
      }

      // 重新加载记忆
      await loadMemory();
      setIsEditing(false);
      alert('更新成功！');
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条记忆吗？此操作无法撤销。')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `${API_BASE}/memories/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('删除失败');
      }

      alert('删除成功！');
      router.push('/memories');
    } catch (err: any) {
      alert(err.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    if (memory) {
      setEditedContent(memory.content);
      setEditedType(memory.memory_type);
    }
    setIsEditing(false);
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !memory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800 mb-4">
                {error || '记忆不存在'}
              </p>
              <Button variant="outline" onClick={() => router.push('/memories')}>
                返回记忆列表
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const typeColor = getMemoryTypeColor(memory.memory_type);
  const typeName = getMemoryTypeName(memory.memory_type);
  const timestamp = memory.created_at || memory.timestamp;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/memories')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回记忆列表
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                记忆详情
              </h1>
              <p className="text-sm text-gray-500 font-mono">ID: {memory.id.slice(0, 16)}...</p>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        删除中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">内容</CardTitle>
              {!isEditing && <Badge variant={typeColor}>{typeName}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                {/* 编辑模式 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    记忆类型
                  </label>
                  <select
                    value={editedType}
                    onChange={(e) => setEditedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">通用</option>
                    <option value="fact">事实</option>
                    <option value="episodic">情节</option>
                    <option value="insight">洞察</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    内容
                  </label>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            ) : (
              <>
                {/* 显示模式 */}
                {memory.metadata?.is_image && memory.metadata?.image_url && (
                  <div className="mb-4">
                    <img
                      src={memory.metadata.image_url}
                      alt={memory.content}
                      className="max-w-full rounded-lg"
                    />
                  </div>
                )}
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {memory.content}
                </p>
                {memory.score !== undefined && (
                  <div className="mt-3 text-sm text-gray-500">
                    相关度分数: {(memory.score * 100).toFixed(1)}%
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 元数据 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5" />
              元数据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {timestamp && (
                <>
                  <div>
                    <dt className="font-medium text-gray-600 flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      创建时间
                    </dt>
                    <dd className="text-gray-900">{formatDate(timestamp)}</dd>
                    <dd className="text-gray-500 text-xs mt-1">
                      {formatRelativeTime(timestamp)}
                    </dd>
                  </div>
                </>
              )}

              {memory.updated_at && (
                <div>
                  <dt className="font-medium text-gray-600 mb-1">最后更新</dt>
                  <dd className="text-gray-900">{formatDate(memory.updated_at)}</dd>
                </div>
              )}

              {memory.access_count !== undefined && (
                <div>
                  <dt className="font-medium text-gray-600 mb-1">访问次数</dt>
                  <dd className="text-gray-900">{memory.access_count}x</dd>
                </div>
              )}

              {memory.last_accessed_at && (
                <div>
                  <dt className="font-medium text-gray-600 mb-1">最后访问</dt>
                  <dd className="text-gray-900">
                    {formatDate(memory.last_accessed_at)}
                  </dd>
                </div>
              )}

              <div>
                <dt className="font-medium text-gray-600 flex items-center gap-2 mb-1">
                  <Hash className="w-4 h-4" />
                  记忆 ID
                </dt>
                <dd className="text-gray-900 font-mono text-xs break-all">
                  {memory.id}
                </dd>
              </div>

              {memory.user_id && (
                <div>
                  <dt className="font-medium text-gray-600 flex items-center gap-2 mb-1">
                    <User className="w-4 h-4" />
                    用户 ID
                  </dt>
                  <dd className="text-gray-900 font-mono text-xs">
                    {memory.user_id}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* 自定义元数据 */}
        {memory.metadata &&
          Object.keys(memory.metadata).filter(
            (key) => !key.startsWith('_') && key !== 'is_image' && key !== 'image_url' && key !== 'thumbnail_url'
          ).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">自定义元数据</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(memory.metadata).filter(
                        ([key]) => !key.startsWith('_') && key !== 'is_image' && key !== 'image_url' && key !== 'thumbnail_url'
                      )
                    ),
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}
