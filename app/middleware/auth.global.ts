export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth();

  if (!auth.hydrated.value && import.meta.client) {
    try {
      await auth.refresh();
    } catch {
      // handled below by redirect logic
    }
  }

  const isAuthRoute = to.path === '/login' || to.path === '/oauthredirect';
  const hasToken = Boolean(auth.token.value);

  if (!auth.isAuthenticated.value && !hasToken && !isAuthRoute) {
    return navigateTo('/login');
  }

  if (auth.user.value?.is_employee) {
    await auth.logout();
    return abortNavigation('Funcionários não acessam o client web.');
  }

  if ((auth.isAuthenticated.value || hasToken) && isAuthRoute) {
    return navigateTo('/');
  }
});
