'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为 6 个字符');
      return;
    }

    setLoading(true);

    try {
      await register({ username, email, password });
      // AuthContext's register will handle the redirect
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试');
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Me2</h1>
          <p className="text-muted-foreground">像朋友一样懂你的 AI 伙伴</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">注册</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                  用户名
                </label>
                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className={inputClass} placeholder="请输入用户名" disabled={loading} />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  邮箱
                </label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="请输入邮箱地址" disabled={loading} />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  密码
                </label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputClass} placeholder="请输入密码（至少 6 位）" disabled={loading} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  确认密码
                </label>
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className={inputClass} placeholder="请再次输入密码" disabled={loading} />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !username || !email || !password || !confirmPassword}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    注册中...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    注册
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              已有账号？
              <Link href="/login" className="ml-1 text-primary hover:text-primary/80 font-medium">
                立即登录
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>注册即表示您同意我们的服务条款和隐私政策</p>
        </div>
      </div>
    </div>
  );
}
