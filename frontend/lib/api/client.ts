function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const clean = envUrl.trim();
    return clean.endsWith('/api') ? clean : `${clean.replace(/\/$/, '')}/api`;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.vercel.app')) {
      return `http://${host}:5000/api`;
    }
  }
  return 'http://localhost:5000/api';
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.title || `HTTP ${response.status} ${response.statusText}`;
      let errList: string[] = [];
      if (data?.errors) {
        if (Array.isArray(data.errors)) {
          errList = data.errors;
        } else if (typeof data.errors === 'object') {
          errList = Object.values(data.errors).flat() as string[];
        }
      }
      return {
        success: false,
        message: errorMsg,
        errors: errList,
      };
    }

    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error or backend unreachable',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
