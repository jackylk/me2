'use client';

import { useState, useRef, DragEvent } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  userId: string;
  onUploadSuccess?: (imageData: any) => void;
  onUploadError?: (error: string) => void;
  showPreview?: boolean;
  maxSize?: number; // MB
}

export default function ImageUpload({
  userId,
  onUploadSuccess,
  onUploadError,
  showPreview = true,
  maxSize = 10,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return '只支持图片文件';
    }

    // 验证文件大小
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `文件过大，最大支持 ${maxSize}MB`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    // 验证文件
    const error = validateFile(file);
    if (error) {
      onUploadError?.(error);
      return;
    }

    // 生成预览
    if (showPreview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // 上传文件
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/images/${userId}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '上传失败');
      }

      const data = await response.json();
      onUploadSuccess?.(data);

      // 重置状态
      setPreview(null);
      setCaption('');

    } catch (error: any) {
      console.error('上传失败:', error);
      onUploadError?.(error.message || '上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = () => {
    setPreview(null);
    setCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      {!preview ? (
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <Upload
            className={`w-12 h-12 mx-auto mb-4 ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`}
          />

          <div className="text-lg font-medium text-gray-700 mb-2">
            {isDragging ? '松开以上传' : '点击或拖拽图片到这里'}
          </div>

          <div className="text-sm text-gray-500">
            支持 JPG、PNG、GIF 等格式，最大 {maxSize}MB
          </div>
        </div>
      ) : (
        /* 预览区域 */
        <div className="relative border-2 border-gray-200 rounded-lg p-4">
          {/* 关闭按钮 */}
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            disabled={uploading}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          {/* 图片预览 */}
          <div className="mb-4">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-64 mx-auto rounded-lg"
            />
          </div>

          {/* 说明输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              图片说明（可选）
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="描述这张图片..."
              rows={2}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* 上传状态 */}
          {uploading && (
            <div className="flex items-center justify-center gap-2 py-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>上传中...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
