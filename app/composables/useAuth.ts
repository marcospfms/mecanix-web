type AuthUser = {
  id: number;
  name: string;
  email: string | null;
  is_admin: boolean;
  is_employee: boolean;
  created_at: string;
  updated_at: string;
}

type GoogleAuthResponse = {
  token: string;
  user: AuthUser;
  action: 'login' | 'linked' | 'registered';
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type GoogleLoginPayload = {
  id_token: string;
}

type DevLoginResponse = {
  token: string;
  user: AuthUser;
}

export const AUTH_COOKIE_KEY = 'mecanix_client_token'

export function useAuth() {
  const token = useCookie<string | null>(AUTH_COOKIE_KEY, {
    sameSite: 'lax',
    secure: false,
    default: () => null
  })

  const user = useState<AuthUser | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => false)
  const hydrated = useState<boolean>('auth-hydrated', () => false)
  const { $api } = useNuxtApp()

  const isAuthenticated = computed(() => Boolean(token.value && user.value))

  const refresh = async () => {
    if (!token.value) {
      user.value = null
      hydrated.value = true
      return null
    }

    loading.value = true

    try {
      const response = await $api<ApiEnvelope<AuthUser>>('/me')
      user.value = response.data

      if (response.data.is_employee) {
        token.value = null
        user.value = null
        throw createError({
          statusCode: 403,
          statusMessage: 'Funcionários não acessam o client web.'
        })
      }

      return response.data
    } catch (error) {
      token.value = null
      user.value = null
      throw error
    } finally {
      loading.value = false
      hydrated.value = true
    }
  }

  const loginWithGoogle = async (payload: GoogleLoginPayload) => {
    loading.value = true

    try {
      const response = await $api<ApiEnvelope<GoogleAuthResponse>>(
        '/auth/google',
        {
          method: 'POST',
          body: payload
        }
      )

      token.value = response.data.token
      user.value = response.data.user

      if (response.data.user.is_employee) {
        token.value = null
        user.value = null
        throw createError({
          statusCode: 403,
          statusMessage: 'Funcionários não acessam o client web.'
        })
      }

      hydrated.value = true

      return response.data
    } finally {
      loading.value = false
    }
  }

  const loginWithDevUser = async (userId: number) => {
    loading.value = true

    try {
      const response = await $api<ApiEnvelope<DevLoginResponse>>(
        '/dev-login/login-as',
        {
          method: 'POST',
          body: {
            user_id: userId,
            device_name: 'dev-client-web'
          }
        }
      )

      token.value = response.data.token
      user.value = response.data.user

      if (response.data.user.is_employee) {
        token.value = null
        user.value = null
        throw createError({
          statusCode: 403,
          statusMessage: 'Funcionários não acessam o client web.'
        })
      }

      hydrated.value = true

      return response.data
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      if (token.value) {
        await $api('/logout', { method: 'POST' })
      }
    } finally {
      token.value = null
      user.value = null
      hydrated.value = true
      await navigateTo({ name: 'login' })
    }
  }

  return {
    token,
    user,
    loading: readonly(loading),
    hydrated: readonly(hydrated),
    isAuthenticated,
    loginWithGoogle,
    loginWithDevUser,
    refresh,
    logout
  }
}
