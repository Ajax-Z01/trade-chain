<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-gray-900">
    <!-- Header -->
    <header class="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold text-indigo-600">TradeChain Dashboard</h1>
      </div>

      <nav>
        <ul class="flex gap-6 font-medium text-gray-700">
          <li>
            <NuxtLink
              to="/"
              class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
              >Home</NuxtLink
            >
          </li>
          <li>
            <NuxtLink
              to="/wallet"
              class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
              >Wallets</NuxtLink
            >
          </li>
          <li>
            <NuxtLink
              to="/contracts"
              class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
              >Contracts</NuxtLink
            >
          </li>
        </ul>
      </nav>

      <div class="ml-4">
        <button
          class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition"
          title="User profile"
        >
          <span class="text-sm font-semibold text-gray-700">U</span>
        </button>
      </div>
    </header>

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

<script setup lang="ts">
// Layout logic optional
</script>
