import { useAuth } from './useAuth'
import { useApiFetch } from './useAPI'

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type AuthUser = {
  id: number;
  name: string;
  email: string | null;
  is_admin: boolean;
  is_employee: boolean;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const auth = useAuth()

  const updateInfo = async (name: string, email: string): Promise<void> => {
    const response = await useApiFetch<ApiEnvelope<AuthUser>>('/user', {
      method: 'PUT',
      body: {
        name: name.trim(),
        email: email.trim() || null
      }
    })

    if (auth.user.value) {
      auth.user.value = { ...auth.user.value, ...response.data }
    }
  }

  const updatePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> => {
    await useApiFetch('/user/password', {
      method: 'PUT',
      body: {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword
      }
    })
  }

  return { updateInfo, updatePassword }
}
