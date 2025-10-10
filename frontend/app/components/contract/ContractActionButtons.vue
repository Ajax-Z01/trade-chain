<script setup lang="ts">
import {
  Rocket,
  Loader2,
  Check,
  X,
  PenTool,
  DollarSign,
  Truck,
  CheckCircle2,
  Ban
} from 'lucide-vue-next'
import Button from '~/components/ui/Button.vue'

interface Props {
  loading: 'deploy' | 'deposit' | 'sign' | 'shipping' | 'completed' | 'cancel' | null
  stepStatus: {
    deploy: boolean
    deposit: boolean
    sign: { importer: boolean; exporter: boolean }
    shipping: boolean
    completed: boolean
    cancelled: boolean
  }
  signCompleted: boolean
  isAdmin: boolean
  isImporter: boolean
  isExporter: boolean
  canDeploy: boolean
  canSign: boolean
  canDeposit: boolean
  canStartShipping: boolean
  canComplete: boolean
  canCancel: boolean
}

const props = defineProps<Props>()

const emit = defineEmits([
  'deploy',
  'sign',
  'deposit',
  'start-shipping',
  'complete',
  'cancel'
])
</script>

<template>
  <div class="space-y-3 mt-4">
    <!-- Deploy: hanya Admin -->
    <Button
      v-if="props.isAdmin"
      :disabled="props.loading==='deploy' || props.stepStatus.deploy || !props.canDeploy"
      class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded py-3"
      @click="$emit('deploy')"
    >
      <Rocket class="w-5 h-5"/>
      <span v-if="props.loading!=='deploy'">Deploy Contract</span>
      <Loader2 v-else class="w-5 h-5 animate-spin"/>
      <Check v-if="props.stepStatus.deploy" class="w-5 h-5 text-green-400"/>
    </Button>

    <!-- Sign: hanya Importer & Exporter -->
    <Button
      v-if="props.isImporter || props.isExporter"
      :disabled="!props.stepStatus.deploy || props.loading==='sign' || props.signCompleted || !props.canSign"
      class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded py-3"
      @click="$emit('sign')"
    >
      <PenTool class="w-5 h-5"/>
      <span v-if="props.loading!=='sign'">Sign Agreement</span>
      <Loader2 v-else class="w-5 h-5 animate-spin"/>
      <Check v-if="props.signCompleted" class="w-5 h-5 text-purple-400"/>
    </Button>

    <!-- Deposit: hanya Importer -->
    <Button
      v-if="props.isImporter"
      :disabled="props.loading==='deposit' || props.stepStatus.deposit || !props.canDeposit"
      class="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded py-3"
      @click="$emit('deposit')"
    >
      <DollarSign class="w-5 h-5"/>
      <span v-if="props.loading!=='deposit'">Deposit</span>
      <Loader2 v-else class="w-5 h-5 animate-spin"/>
      <Check v-if="props.stepStatus.deposit" class="w-5 h-5 text-green-400"/>
    </Button>

    <!-- Start Shipping: hanya Exporter -->
    <Button
      v-if="props.isExporter"
      :disabled="props.loading==='shipping' || !props.stepStatus.deposit || props.stepStatus.shipping || !props.canStartShipping"
      class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded py-3"
      @click="$emit('start-shipping')"
    >
      <Truck class="w-5 h-5"/>
      <span v-if="props.loading!=='shipping'">Start Shipping</span>
      <Loader2 v-else class="w-5 h-5 animate-spin"/>
      <Check v-if="props.stepStatus.shipping" class="w-5 h-5 text-green-400"/>
    </Button>

    <!-- Complete: hanya Admin -->
    <Button
      v-if="props.isImporter"
      :disabled="!props.stepStatus.shipping || props.loading==='completed' || props.stepStatus.completed || !props.canComplete"
      class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded py-3"
      @click="$emit('complete')"
    >
      <CheckCircle2 class="w-5 h-5"/>
      <span v-if="props.loading!=='completed'">Complete Contract</span>
      <Loader2 v-else class="w-5 h-5 animate-spin"/>
      <Check v-if="props.stepStatus.completed" class="w-5 h-5 text-green-400"/>
    </Button>

    <!-- Cancel: semua role yg punya izin -->
    <Button
      v-if="props.canCancel"
      :disabled="props.loading==='cancel' || props.stepStatus.completed || props.stepStatus.cancelled"
      class="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded py-3"
      @click="$emit('cancel')"
    >
      <Ban class="w-5 h-5"/>
      <span v-if="props.loading!=='cancel'">Cancel Contract</span>
      <Loader2 v-else class="w-5 h-5 animate-spin"/>
      <X v-if="props.stepStatus.cancelled" class="w-5 h-5 text-white"/>
    </Button>
  </div>
</template>
