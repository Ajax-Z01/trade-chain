<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-gray-900">
    <AppHeader />

    <!-- Main Content -->
    <main class="flex-1 p-6">
      <div class="max-w-7xl mx-auto flex flex-col gap-6">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white shadow-inner p-4 text-center text-sm text-gray-500">
      &copy; 2025 TradeChain
    </footer>
  </div>
</template>
