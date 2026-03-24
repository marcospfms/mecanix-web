export default defineNuxtPlugin(async () => {
  const auth = useAuth();

  if (!auth.hydrated.value) {
    try {
      await auth.refresh();
    } catch {
      // Ignore hydration failures; middleware will handle redirects.
    }
  }
});
