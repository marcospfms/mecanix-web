import type { AsyncData, NuxtError } from 'nuxt/app'
import type { ComputedRef, MultiWatchSources, Ref } from 'vue'

type MaybeGetter<T> = T | Ref<T> | ComputedRef<T> | (() => T)

type UseAPIOptions<TData, TRaw> = {
  key?: MaybeGetter<string>;
  immediate?: boolean;
  server?: boolean;
  lazy?: boolean;
  deep?: boolean;
  dedupe?: 'cancel' | 'defer';
  watch?: MultiWatchSources | false;
  default?: () => TData;
  transform?: (response: TRaw) => TData | Promise<TData>;
}

export function useAPI<TData, TRaw = TData>(
  url: string | (() => string),
  options?: UseAPIOptions<TData, TRaw>
): AsyncData<TData, NuxtError<unknown> | undefined> {
  const { $api } = useNuxtApp()
  const resolvedUrl = typeof url === 'function' ? computed(url) : ref(url)
  const resolvedKey =
    typeof options?.key === 'function'
      ? computed(options.key)
      : options?.key
  const { key, watch, ...restOptions } = options ?? {}
  const asyncOptions: {
    immediate?: boolean;
    server?: boolean;
    lazy?: boolean;
    deep?: boolean;
    dedupe?: 'cancel' | 'defer';
    watch?: MultiWatchSources | false;
    default?: () => TData;
  } = {
    ...restOptions,
    watch:
      watch === false
        ? false
        : (watch ?? (typeof url === 'function' ? [resolvedUrl] : undefined))
  }

  const handler = async () => {
    const response = await $api<TRaw>(resolvedUrl.value)
    const result = options?.transform
      ? await options.transform(response)
      : (response as TData)

    if (result !== undefined) {
      return result
    }

    if (options?.default) {
      return options.default()
    }

    return null as TData
  }

  if (resolvedKey) {
    return useAsyncData<TData>(
      resolvedKey,
      handler,
      asyncOptions
    ) as AsyncData<TData, NuxtError<unknown> | undefined>
  }

  return useAsyncData<TData>(
    handler,
    asyncOptions
  ) as AsyncData<TData, NuxtError<unknown> | undefined>
}

export function useApiFetch<T>(
  url: string,
  options?: Parameters<typeof $fetch<T>>[1]
) {
  const { $api } = useNuxtApp()

  return $api<T>(url, options)
}
