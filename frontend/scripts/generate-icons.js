/**
 * PWA 图标生成脚本
 * 使用 Canvas API 生成不同尺寸的图标
 *
 * 运行: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// 图标尺寸
const ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

// 图标目录
const ICONS_DIR = path.join(__dirname, '../public/icons');

// 创建图标目录
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 生成 SVG 图标内容
function generateIconSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- 渐变背景 -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- 圆角矩形背景 -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>

  <!-- Me2 Logo -->
  <g transform="translate(${size * 0.5}, ${size * 0.5})">
    <!-- 聊天气泡 -->
    <circle cx="0" cy="${size * -0.08}" r="${size * 0.25}" fill="white" opacity="0.9"/>
    <path d="M ${size * -0.15} ${size * 0.12} L ${size * -0.08} ${size * 0.18} L 0 ${size * 0.12}"
          fill="white" opacity="0.9"/>

    <!-- Me2 文字 -->
    <text x="0" y="${size * 0.02}"
          font-family="Arial, sans-serif"
          font-size="${size * 0.18}"
          font-weight="bold"
          fill="#0a0a0a"
          text-anchor="middle"
          dominant-baseline="middle">Me2</text>
  </g>
</svg>`;
}

// 保存 SVG 文件
console.log('🎨 正在生成 PWA 图标...\n');

ICON_SIZES.forEach(size => {
  const svgContent = generateIconSVG(size);
  const filename = `icon-${size}x${size}.png.svg`;
  const filepath = path.join(ICONS_DIR, filename);

  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ 已生成: ${filename}`);
});

// 生成特殊尺寸（聊天和记忆快捷方式图标）
const specialIcons = [
  { name: 'icon-chat-96x96.png.svg', size: 96, emoji: '💬' },
  { name: 'icon-memory-96x96.png.svg', size: 96, emoji: '🧠' }
];

specialIcons.forEach(({ name, size, emoji }) => {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-${emoji}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad-${emoji})"/>
  <text x="${size / 2}" y="${size / 2}"
        font-size="${size * 0.6}"
        text-anchor="middle"
        dominant-baseline="middle">${emoji}</text>
</svg>`;

  const filepath = path.join(ICONS_DIR, name);
  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ 已生成: ${name}`);
});

console.log('\n📝 注意: 生成的是 SVG 文件（.svg 扩展名）');
console.log('📝 如需 PNG 格式，请使用在线工具转换或安装图像处理库');
console.log('\n💡 推荐在线转换工具:');
console.log('   - https://cloudconvert.com/svg-to-png');
console.log('   - https://svgtopng.com/');
console.log('\n✨ 图标生成完成！');
