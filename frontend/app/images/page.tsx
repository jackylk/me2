'use client';

import { useEffect, useState } from 'react';
import { Image as ImageIcon, Upload as UploadIcon } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import ImageUpload from '@/components/ImageUpload';
import ImageGallery from '@/components/ImageGallery';

interface ImageData {
  memory_id: string;
  content: string;
  image_url: string;
  thumbnail_url?: string;
  original_filename: string;
  file_size: number;
  upload_time: string;
  timestamp: string;
}

export default function ImagesPage() {
  const { userId } = useAuth();
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (userId) {
      if (userId) loadImages(userId);
    }
  }, [userId]);

  const loadImages = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/images/${uid}/list?limit=100`
      );

      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error('加载图片失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (data: any) => {
    console.log('上传成功:', data);
    setShowUpload(false);
    // 重新加载图片列表
    if (userId) loadImages(userId);
  };

  const handleUploadError = (error: string) => {
    alert(`上传失败: ${error}`);
  };

  const handleDelete = async (memoryId: string) => {
    if (!userId) return;
    // 找到对应的图片
    const image = images.find((img) => img.memory_id === memoryId);
    if (!image) return;

    try {
      // 从 URL 中提取 filename
      const url = new URL(image.image_url);
      const filename = url.pathname.split('/').slice(-3).join('/'); // user_id/date/file

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/images/${userId}/${filename}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // 重新加载图片列表
        if (userId) loadImages(userId);
      } else {
        const errorData = await response.json();
        alert(`删除失败: ${errorData.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除图片失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  const handleAddCaption = async (memoryId: string, caption: string) => {
    if (!userId) return;
    try {
      const formData = new FormData();
      formData.append('memory_id', memoryId);
      formData.append('caption', caption);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/images/${userId}/caption`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        alert('说明添加成功');
        // 重新加载图片列表
        if (userId) loadImages(userId);
      } else {
        const errorData = await response.json();
        alert(`添加失败: ${errorData.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error('添加说明失败:', error);
      alert('添加失败，请稍后重试');
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">图片管理</h1>
            <p className="text-gray-500">上传和管理你的图片记忆</p>
          </div>

          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <UploadIcon className="w-5 h-5" />
            {showUpload ? '关闭上传' : '上传图片'}
          </button>
        </div>

        {/* 统计 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ImageIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <div className="text-3xl font-bold">{images.length}</div>
              <div className="text-gray-500">张图片</div>
            </div>
          </div>
        </div>

        {/* 上传区域 */}
        {showUpload && userId && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">上传新图片</h2>
            <ImageUpload
              userId={userId!}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>
        )}

        {/* 图片画廊 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">我的图片</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : (
            <ImageGallery
              images={images}
              onDelete={handleDelete}
              onAddCaption={handleAddCaption}
            />
          )}
        </div>

        {/* 使用说明 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>上传图片</strong>: 点击"上传图片"按钮，支持拖拽上传</li>
            <li>• <strong>查看大图</strong>: 点击缩略图查看原图和详细信息</li>
            <li>• <strong>添加说明</strong>: 在详情页面可以为图片添加说明</li>
            <li>• <strong>下载图片</strong>: 在详情页面点击下载按钮</li>
            <li>• <strong>删除图片</strong>: 在详情页面点击删除按钮（不可恢复）</li>
            <li>• 支持 JPG、PNG、GIF 等常见格式，单张最大 10MB</li>
            <li>• 图片会自动关联到你的记忆中，可在聊天中引用</li>
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
}
