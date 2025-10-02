<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
import Toast from '~/components/Toast.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    
    <!-- Header -->
    <AppHeader class="sticky top-0 z-50" />

    <!-- Main Content -->
    <main class="flex-1 p-6 dark:bg-gray-800 transition-colors duration-300">
      <div class="max-w-7xl mx-auto flex flex-col gap-6">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-900 shadow-inner p-4 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
      &copy; 2025 TradeChain
    </footer>

    <!-- Global Toast -->
    <Toast />
  </div>
</template>
