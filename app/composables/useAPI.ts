import type { UseFetchOptions } from 'nuxt/app';

export function useAPI<T>(
  url: string | (() => string),
  options?: UseFetchOptions<T>
) {
  const { $api } = useNuxtApp();

  return useFetch(url, {
    ...options,
    $fetch: $api as typeof $fetch
  });
}

export function useApiFetch<T>(url: string, options?: Parameters<typeof $fetch<T>>[1]) {
  const { $api } = useNuxtApp();

  return $api<T>(url, options);
}
