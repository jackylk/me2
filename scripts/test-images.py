#!/usr/bin/env python3
"""
测试图片上传功能
"""
import asyncio
import sys
import os
import io
from pathlib import Path

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.services.image_storage import image_storage
from app.services.neuromemory_client import neuromemory_client


def create_test_image():
    """创建测试图片（纯色方块）"""
    try:
        from PIL import Image

        # 创建 300x300 的蓝色方块
        img = Image.new('RGB', (300, 300), color='blue')

        # 保存到字节流
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)

        return img_bytes
    except ImportError:
        print("Pillow 未安装，无法生成测试图片。请运行: pip install Pillow")
        sys.exit(1)


async def test_upload():
    """测试图片上传"""
    print("=" * 50)
    print("测试图片上传")
    print("=" * 50)

    user_id = "test_user_001"

    # 创建测试图片
    print("\n创建测试图片...")
    test_image = create_test_image()

    # 上传图片
    print(f"\n上传图片...")
    result = await image_storage.upload(
        file=test_image,
        original_filename="test_image.jpg",
        user_id=user_id,
        metadata={"description": "测试图片"}
    )

    print(f"\n✓ 上传成功:")
    print(f"  文件名: {result['filename']}")
    print(f"  URL: {result['url']}")
    print(f"  大小: {result['size']} bytes")
    print(f"  类型: {result['content_type']}")
    print(f"  哈希: {result['hash'][:16]}...")

    return result


async def test_thumbnail():
    """测试缩略图生成"""
    print("\n" + "=" * 50)
    print("测试缩略图生成")
    print("=" * 50)

    # 创建大图
    print("\n创建大图 (1000x1000)...")
    try:
        from PIL import Image
        img = Image.new('RGB', (1000, 1000), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        original_content = img_bytes.getvalue()

        print(f"原图大小: {len(original_content)} bytes")

        # 生成缩略图
        print("\n生成缩略图 (300x300)...")
        thumbnail_content = await image_storage.generate_thumbnail(original_content)

        print(f"缩略图大小: {len(thumbnail_content)} bytes")
        print(f"压缩率: {(1 - len(thumbnail_content) / len(original_content)) * 100:.1f}%")

        print("\n✓ 缩略图生成成功")

    except Exception as e:
        print(f"\n✗ 缩略图生成失败: {e}")


async def test_list_images():
    """测试获取图片列表"""
    print("\n" + "=" * 50)
    print("测试获取图片列表")
    print("=" * 50)

    user_id = "test_user_001"

    # 从 NeuroMemory 获取包含图片的记忆
    from datetime import datetime, timedelta, timezone

    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=30)

    memories = await neuromemory_client.get_by_time_range(
        user_id=user_id,
        start_time=start_time,
        end_time=end_time
    )

    # 筛选包含图片的记忆
    image_memories = [
        m for m in memories
        if m.get("metadata", {}).get("is_image")
    ]

    print(f"\n找到 {len(image_memories)} 张图片:")
    for i, memory in enumerate(image_memories[:5], 1):
        metadata = memory.get("metadata", {})
        print(f"  {i}. {metadata.get('original_filename', 'unknown')}")
        print(f"     URL: {metadata.get('image_url', 'N/A')[:60]}...")
        print(f"     大小: {metadata.get('file_size', 0)} bytes")


async def test_delete():
    """测试图片删除"""
    print("\n" + "=" * 50)
    print("测试图片删除")
    print("=" * 50)

    # 上传测试图片
    print("\n上传测试图片...")
    test_image = create_test_image()
    result = await image_storage.upload(
        file=test_image,
        original_filename="delete_test.jpg",
        user_id="test_user_001"
    )

    filename = result['filename']
    print(f"  文件名: {filename}")

    # 删除图片
    print(f"\n删除图片...")
    success = await image_storage.delete(filename)

    if success:
        print("✓ 删除成功")
    else:
        print("✗ 删除失败")


async def test_add_to_memory():
    """测试添加图片到记忆"""
    print("\n" + "=" * 50)
    print("测试添加图片到记忆")
    print("=" * 50)

    user_id = "test_user_001"

    # 上传图片
    print("\n上传图片...")
    test_image = create_test_image()
    upload_result = await image_storage.upload(
        file=test_image,
        original_filename="memory_test.jpg",
        user_id=user_id
    )

    # 添加到 NeuroMemory
    print(f"\n添加到 NeuroMemory...")
    memory_result = await neuromemory_client.add_memory(
        user_id=user_id,
        content="这是一张测试图片",
        memory_type="image",
        metadata={
            "image_url": upload_result['url'],
            "original_filename": upload_result['original_filename'],
            "file_size": upload_result['size'],
            "is_image": True
        }
    )

    print(f"✓ 添加成功:")
    print(f"  记忆 ID: {memory_result.get('id', 'N/A')}")


async def main():
    """主函数"""
    try:
        # 测试上传
        await test_upload()

        # 测试缩略图
        await test_thumbnail()

        # 测试添加到记忆
        await test_add_to_memory()

        # 测试获取列表
        await test_list_images()

        # 测试删除
        await test_delete()

        print("\n" + "=" * 50)
        print("✓ 所有测试完成！")
        print("=" * 50)
        print("\n接下来可以:")
        print("1. 启动后端: cd backend && uvicorn app.main:app --reload")
        print("2. 启动前端: cd frontend && npm run dev")
        print("3. 访问 http://localhost:3000/images 上传和管理图片")

    except Exception as e:
        print(f"\n✗ 测试失败: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
