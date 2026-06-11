declare const process: {
  env: Record<string, string | undefined>;
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/image', '@nuxt/ui'],

  devtools: {
    enabled: true
  },
  app: {
    baseURL: '/'
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8000/api',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      googleClientId:
        process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID
        || process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID_WEB
        || '',
      devLoginEnabled: process.env.NUXT_PUBLIC_DEV_LOGIN_ENABLED === 'true',
    }
  },

  build: {
    transpile: ['vue']
  },

  experimental: {
    typedPages: true
  },

  compatibilityDate: '2025-01-15',

  vite: {
    // Uma só cópia do Vue (evita currentRenderingInstance === null em renderSlot com pnpm)
    resolve: {
      dedupe: ['vue', '@vue/runtime-core', '@vue/runtime-dom']
    },
    optimizeDeps: {
      include: ['@vue/devtools-core', '@vue/devtools-kit']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
