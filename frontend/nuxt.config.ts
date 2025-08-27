// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  modules: [
    '@nuxtjs/tailwindcss',
  ],
  
  css: [
    '@/assets/css/tailwind.css',
  ],
  
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  
  runtimeConfig: {
    // private
    apiSecret: process.env.API_SECRET,

    // public
    public: {
      apiBase: process.env.API_BASE || 'http://localhost:5000/api',
    },
  },
})
