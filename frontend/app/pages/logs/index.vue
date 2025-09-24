<script setup lang="ts">
import { ref } from 'vue'
import { NuxtLink } from '#components'
import { Wallet, FileText, Activity, FileText as DocumentIcon, User } from 'lucide-vue-next'

// --- Define the cards ---
interface LogCard {
  title: string
  description: string
  icon: any
  link: string
  color: string
}

const logCards = ref<LogCard[]>([
  {
    title: 'Wallet Logs',
    description: 'View all wallet activity',
    icon: Wallet,
    link: '/logs/wallet',
    color: 'indigo-600'
  },
  {
    title: 'Contract Logs',
    description: 'View deployed contract activity',
    icon: FileText,
    link: '/logs/contract',
    color: 'green-600'
  },
  {
    title: 'Activity Logs',
    description: 'Detailed activity logs',
    icon: Activity,
    link: '/logs/activity',
    color: 'orange-600'
  },
  {
    title: 'Aggregated Activity Logs',
    description: 'Summary of all activities',
    icon: Activity,
    link: '/logs/aggregatedactivity',
    color: 'purple-600'
  },
  {
    title: 'KYC Logs',
    description: 'User KYC verification logs',
    icon: User,
    link: '/logs/kyc',
    color: 'teal-600'
  },
  {
    title: 'Document Logs',
    description: 'Uploaded document activity',
    icon: DocumentIcon,
    link: '/logs/document',
    color: 'pink-600'
  }
])
</script>

<template>
  <section class="p-4 max-w-6xl mx-auto">
    <h2 class="text-2xl font-bold text-indigo-600 mb-4">Logs Dashboard</h2>
    <p class="text-gray-500 mb-6">Quick access to all your logs.</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink
        v-for="card in logCards"
        :key="card.title"
        :to="card.link"
        class="bg-white rounded-xl shadow hover:shadow-lg transition p-5 flex items-center gap-4"
      >
        <component :is="card.icon" :class="`w-10 h-10 text-${card.color}`" />
        <div>
          <h3 class="text-lg font-semibold">{{ card.title }}</h3>
          <p class="text-gray-500 text-sm">{{ card.description }}</p>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
