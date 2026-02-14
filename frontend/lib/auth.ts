/**
 * 认证工具函数
 */

const TOKEN_KEY = 'me2_access_token';
const USER_ID_KEY = 'me2_user_id';
const USERNAME_KEY = 'me2_username';

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

/**
 * 保存认证 Token
 */
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * 获取认证 Token
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * 删除认证 Token
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USERNAME_KEY);
  }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * 解析 JWT Token 获取 Payload
 */
export function parseToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('解析 Token 失败:', error);
    return null;
  }
}

/**
 * 从 Token 中获取用户 ID
 */
export function getUserIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;

  const payload = parseToken(token);
  return payload?.sub || null;
}

/**
 * 保存用户 ID
 */
export function saveUserId(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_ID_KEY, userId);
  }
}

/**
 * 获取用户 ID（优先从 Token，其次从 localStorage）
 */
export function getUserId(): string | null {
  // 优先从 Token 解析
  const userIdFromToken = getUserIdFromToken();
  if (userIdFromToken) {
    saveUserId(userIdFromToken); // 同步到 localStorage
    return userIdFromToken;
  }

  // 降级方案：从 localStorage 读取
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USER_ID_KEY);
  }

  return null;
}

/**
 * 保存用户名
 */
export function saveUsername(username: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USERNAME_KEY, username);
  }
}

/**
 * 获取用户名
 */
export function getUsername(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USERNAME_KEY);
  }
  return null;
}

/**
 * 用户注册
 */
export async function register(data: RegisterData): Promise<AuthTokens> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '注册失败');
  }

  const tokens: AuthTokens = await response.json();
  saveToken(tokens.access_token);

  // 解析并保存用户 ID
  const userId = getUserIdFromToken();
  if (userId) {
    saveUserId(userId);
  }

  // 保存用户名
  saveUsername(data.username);

  return tokens;
}

/**
 * 用户登录
 */
export async function login(credentials: LoginCredentials): Promise<AuthTokens> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '登录失败');
  }

  const tokens: AuthTokens = await response.json();
  saveToken(tokens.access_token);

  // 解析并保存用户 ID
  const userId = getUserIdFromToken();
  if (userId) {
    saveUserId(userId);
  }

  // 保存用户名
  saveUsername(credentials.username);

  return tokens;
}

/**
 * 用户登出
 */
export function logout(): void {
  removeToken();
}

/**
 * 获取带认证头的 Fetch 配置
 */
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    return {
      'Content-Type': 'application/json',
    };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
