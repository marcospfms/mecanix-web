/**
 * Alinha com mecanix-app (`shared/http/resolveServerUrl`): monta URL absoluta de assets
 * do core a partir de `NUXT_PUBLIC_API_URL`, para logos e paths relativos funcionarem no browser.
 */
export function useResolveServerUrl() {
  const config = useRuntimeConfig()

  return function resolveServerUrl(urlOrPath: string | null | undefined): string | null {
    if (!urlOrPath) {
      return null
    }

    const trimmed = urlOrPath.trim()
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed
    }

    const apiUrl = String(config.public.apiUrl ?? '').replace(/\/$/, '')
    const serverBase = apiUrl.replace(/\/api\/?$/, '')

    const stripHost = (url: string) => url.replace(/^https?:\/\/[^/]+/i, '')

    if (/^https?:\/\//i.test(trimmed)) {
      if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\//i.test(trimmed)) {
        return serverBase + stripHost(trimmed)
      }
      return trimmed
    }

    return serverBase + (trimmed.startsWith('/') ? trimmed : `/${trimmed}`)
  }
}
