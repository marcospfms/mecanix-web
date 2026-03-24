type AuthUser = {
  id: number;
  name: string;
  email: string | null;
  is_admin: boolean;
  is_employee: boolean;
  created_at: string;
  updated_at: string;
};

type GoogleAuthResponse = {
  token: string;
  user: AuthUser;
  action: 'login' | 'linked' | 'registered';
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type GoogleLoginPayload = {
  id_token: string;
};

const AUTH_COOKIE_KEY = 'mecanix_client_token';

export function useAuth() {
  const token = useCookie<string | null>(AUTH_COOKIE_KEY, {
    sameSite: 'lax',
    secure: false,
    default: () => null
  });

  const user = useState<AuthUser | null>('auth-user', () => null);
  const loading = useState<boolean>('auth-loading', () => false);
  const hydrated = useState<boolean>('auth-hydrated', () => false);
  const runtimeConfig = useRuntimeConfig();

  const isAuthenticated = computed(() => Boolean(token.value && user.value));

  const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');

    if (token.value) {
      headers.set('Authorization', `Bearer ${token.value}`);
    }

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await $fetch<ApiEnvelope<T>>(path, {
      baseURL: runtimeConfig.public.apiUrl,
      ...options,
      headers
    });

    return response.data;
  };

  const refresh = async () => {
    if (!token.value) {
      user.value = null;
      hydrated.value = true;
      return null;
    }

    loading.value = true;

    try {
      const response = await apiFetch<AuthUser>('/me');
      user.value = response;

      if (response.is_employee) {
        token.value = null;
        user.value = null;
        throw createError({
          statusCode: 403,
          statusMessage: 'Funcionários não acessam o client web.'
        });
      }

      return response;
    } catch (error) {
      token.value = null;
      user.value = null;
      throw error;
    } finally {
      loading.value = false;
      hydrated.value = true;
    }
  };

  const loginWithGoogle = async (payload: GoogleLoginPayload) => {
    loading.value = true;

    try {
      const response = await apiFetch<GoogleAuthResponse>('/auth/google', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      token.value = response.token;
      user.value = response.user;

      if (response.user.is_employee) {
        token.value = null;
        user.value = null;
        throw createError({
          statusCode: 403,
          statusMessage: 'Funcionários não acessam o client web.'
        });
      }

      hydrated.value = true;

      return response;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    token.value = null;
    user.value = null;
    hydrated.value = true;
    await navigateTo('/login');
  };

  return {
    token,
    user,
    loading: readonly(loading),
    hydrated: readonly(hydrated),
    isAuthenticated,
    loginWithGoogle,
    refresh,
    logout
  };
}
