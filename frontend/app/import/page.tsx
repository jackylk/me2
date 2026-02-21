'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface ImportTask {
  task_id: string;
  status: string;
  progress: number;
  total_messages: number;
  user_messages: number;
  extracted_memories: number;
  error_message?: string;
  summary?: {
    total_messages: number;
    user_messages: number;
    extracted_knowledge: number;
    type_distribution: Record<string, number>;
    average_confidence: number;
    highlights: string[];
  };
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<string>('wechat');
  const [userIdentifier, setUserIdentifier] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [currentTask, setCurrentTask] = useState<ImportTask | null>(null);
  const [polling, setPolling] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const userId = localStorage.getItem('me2_user_id') || '';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_type', sourceType);
      formData.append('user_id', userId);
      if (userIdentifier) {
        formData.append('user_identifier', userIdentifier);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/import/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        // 开始轮询任务状态
        startPolling(data.task_id);
      } else {
        alert('上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const startPolling = (taskId: string) => {
    setPolling(true);

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/import/tasks/${taskId}`
        );

        if (response.ok) {
          const task: ImportTask = await response.json();
          setCurrentTask(task);

          // 如果任务完成或失败，停止轮询
          if (task.status === 'completed' || task.status === 'failed') {
            clearInterval(interval);
            setPolling(false);
          }
        }
      } catch (error) {
        console.error('获取任务状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'processing':
      case 'pending':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '等待处理',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
    };
    return statusMap[status] || status;
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto p-6 h-full overflow-y-auto">
        <h1 className="text-3xl font-bold mb-2">导入聊天记录</h1>
        <p className="text-gray-500 mb-8">
          快速从历史聊天记录中学习你的语气和思维方式
        </p>

        {/* Upload Form */}
        {!currentTask && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">上传文件</h2>

            {/* Source Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                来源类型
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="wechat">WeChat (格式: YYYY-MM-DD HH:MM:SS 昵称)</option>
                <option value="wechat_text">WeChat 文本导出</option>
                <option value="telegram">Telegram JSON</option>
                <option value="telegram_text">Telegram 文本</option>
              </select>
            </div>

            {/* User Identifier */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                你的昵称/用户名（用于识别你的消息）
              </label>
              <input
                type="text"
                value={userIdentifier}
                onChange={(e) => setUserIdentifier(e.target.value)}
                placeholder="例如：张三、John"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                如果不填写，将尝试自动识别
              </p>
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择文件
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".txt,.json"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  {file ? (
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span className="text-blue-600">{file.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">
                      点击选择文件或拖拽到这里
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-500 text-white rounded-lg px-6 py-3 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  开始导入
                </>
              )}
            </button>
          </div>
        )}

        {/* Task Progress */}
        {currentTask && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">导入进度</h2>
              {getStatusIcon(currentTask.status)}
            </div>

            {/* Progress Bar */}
            {currentTask.status === 'processing' && (
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${currentTask.progress * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {Math.round(currentTask.progress * 100)}%
                </p>
              </div>
            )}

            {/* Status */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">状态</span>
                <span className="font-medium">{getStatusText(currentTask.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总消息数</span>
                <span className="font-medium">{currentTask.total_messages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">你的消息</span>
                <span className="font-medium">{currentTask.user_messages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">提取的记忆</span>
                <span className="font-medium">{currentTask.extracted_memories}</span>
              </div>
            </div>

            {/* Summary */}
            {currentTask.status === 'completed' && currentTask.summary && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">导入摘要</h3>

                {/* Type Distribution */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">知识分布</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentTask.summary.type_distribution).map(
                      ([type, count]) => (
                        <span
                          key={type}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                        >
                          {type}: {count}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Highlights */}
                {currentTask.summary.highlights.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">精彩亮点</p>
                    <ul className="space-y-2">
                      {currentTask.summary.highlights.map((highlight, index) => (
                        <li key={index} className="text-sm text-gray-700">
                          • {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action */}
                <button
                  onClick={() => {
                    setCurrentTask(null);
                    setFile(null);
                  }}
                  className="mt-6 w-full bg-green-500 text-white rounded-lg px-6 py-3 hover:bg-green-600 transition-colors"
                >
                  继续导入更多
                </button>
              </div>
            )}

            {/* Error */}
            {currentTask.status === 'failed' && (
              <div className="border-t pt-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">
                    {currentTask.error_message || '导入失败，请重试'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCurrentTask(null);
                    setFile(null);
                  }}
                  className="mt-4 w-full bg-gray-500 text-white rounded-lg px-6 py-3 hover:bg-gray-600 transition-colors"
                >
                  重新导入
                </button>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📖 使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• WeChat: 导出聊天记录为 TXT 格式</li>
            <li>• Telegram: 使用 Telegram Desktop 导出为 JSON</li>
            <li>• 建议导入至少 50 条消息以获得更好的学习效果</li>
            <li>• 导入完成后，Me2 将自动学习你的语气和表达方式</li>
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
}
