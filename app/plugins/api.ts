export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const token = useCookie<string | null>('mecanix_client_token', {
    sameSite: 'lax',
    secure: false,
    default: () => null
  })

  const api = $fetch.create({
    baseURL: runtimeConfig.public.apiUrl,
    onRequest({ options }) {
      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')

      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }

      options.headers = headers
    }
  })

  return {
    provide: {
      api
    }
  }
})
