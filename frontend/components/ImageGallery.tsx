'use client';

import { useState } from 'react';
import { X, Download, Trash2, MessageCircle } from 'lucide-react';

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

interface ImageGalleryProps {
  images: ImageData[];
  onDelete?: (memoryId: string) => void;
  onAddCaption?: (memoryId: string, caption: string) => void;
}

export default function ImageGallery({
  images,
  onDelete,
  onAddCaption,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [isAddingCaption, setIsAddingCaption] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAddCaption = async (memoryId: string) => {
    if (!captionInput.trim()) return;

    setIsAddingCaption(true);
    try {
      await onAddCaption?.(memoryId, captionInput);
      setCaptionInput('');
      setSelectedImage(null);
    } finally {
      setIsAddingCaption(false);
    }
  };

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* 图片网格 */}
      {images.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          还没有上传图片
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.memory_id}
              className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image.thumbnail_url || image.image_url}
                alt={image.content}
                className="w-full h-full object-cover"
              />

              {/* 悬停遮罩 */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-white text-sm text-center px-2">
                    {image.content.slice(0, 50)}
                    {image.content.length > 50 && '...'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 图片详情模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedImage.original_filename}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedImage.timestamp)} •{' '}
                  {formatFileSize(selectedImage.file_size)}
                </p>
              </div>

              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 图片 */}
            <div className="p-4">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.content}
                className="max-w-full mx-auto rounded-lg"
              />
            </div>

            {/* 说明 */}
            <div className="p-4 border-t">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  图片说明
                </h4>
                <p className="text-gray-800">{selectedImage.content}</p>
              </div>

              {/* 添加说明 */}
              {onAddCaption && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    添加新说明
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={captionInput}
                      onChange={(e) => setCaptionInput(e.target.value)}
                      placeholder="输入图片说明..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCaption(selectedImage.memory_id);
                        }
                      }}
                    />
                    <button
                      onClick={() =>
                        handleAddCaption(selectedImage.memory_id)
                      }
                      disabled={isAddingCaption || !captionInput.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {isAddingCaption ? '添加中...' : '添加'}
                    </button>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleDownload(
                      selectedImage.image_url,
                      selectedImage.original_filename
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载
                </button>

                {onDelete && (
                  <button
                    onClick={() => {
                      if (
                        confirm('确定要删除这张图片吗？此操作无法撤销。')
                      ) {
                        onDelete(selectedImage.memory_id);
                        setSelectedImage(null);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
