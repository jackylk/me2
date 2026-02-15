'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 检查是否已经是独立应用
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');

    setIsStandalone(standalone);

    // 如果不是独立应用，检查是否应该显示安装提示
    if (!standalone) {
      const installDismissed = localStorage.getItem('me2-install-dismissed');
      const installCount = parseInt(localStorage.getItem('me2-visit-count') || '0');

      // 第3次访问后显示安装提示（如果之前没有关闭过）
      if (!installDismissed && installCount >= 2) {
        setShowPrompt(true);
      }

      // 记录访问次数
      localStorage.setItem('me2-visit-count', (installCount + 1).toString());
    }
  }, []);

  const handleInstall = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).showInstallPrompt) {
        const accepted = await (window as any).showInstallPrompt();
        if (accepted) {
          setShowPrompt(false);
        }
      } else {
        // iOS 设备显示手动安装说明
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
          alert(
            '在 Safari 浏览器中：\n\n' +
            '1. 点击底部的"分享"按钮\n' +
            '2. 向下滚动并点击"添加到主屏幕"\n' +
            '3. 点击"添加"完成安装'
          );
        } else {
          alert('请使用支持的浏览器（Chrome、Edge、Safari）安装此应用');
        }
      }
    } catch (error) {
      console.error('Install error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('me2-install-dismissed', 'true');
  };

  // 如果已经是独立应用或不需要显示提示，则不渲染
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 backdrop-blur-xl bg-opacity-95">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
            📱
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              安装 Me2 到主屏幕
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              获得更快的访问速度和更好的体验
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                立即安装
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
