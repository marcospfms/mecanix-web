export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()
  const hasToken = Boolean(auth.token.value)

  if (!auth.hydrated.value && hasToken) {
    try {
      await auth.refresh()
    } catch {
      // handled below by redirect logic
    }
  }

  const isAuthRoute = to.name === 'login' || to.name === 'oauthredirect'

  if (!auth.isAuthenticated.value && !hasToken && !isAuthRoute) {
    return navigateTo({ name: 'login' })
  }

  if (auth.user.value?.is_employee) {
    await auth.logout()
    return abortNavigation('Funcionários não acessam o client web.')
  }

  if ((auth.isAuthenticated.value || hasToken) && isAuthRoute) {
    return navigateTo({ name: 'index' })
  }
})
