<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

// Components
import ContractInfo from '~/components/contract/ContractInfo.vue'
import ContractLogs from '~/components/contract/ContractLogs.vue'
import RoleInfo from '~/components/RoleInfo.vue'
import ContractStepper from '~/components/contract/ContractStepper.vue'
import ContractActionButtons from '~/components/contract/ContractActionButtons.vue'

// Composables
import { useTradeContract } from '~/composables/useTradeContract'
import { useContractLogs } from '~/composables/useContractLogs'
import { useContractRole } from '~/composables/useContractRole'

// Route
const route = useRoute()
const contractAddress = route.params.contract as string

// Trade contract composable
const trade = useTradeContract()
trade.selectedContract.value = contractAddress

// Contract logs composable
const { contractStates, fetchContractLogs, getContractState } = useContractLogs()
const state = computed(() => contractStates[contractAddress] ?? getContractState(contractAddress))

// Role detection
const selectedContract = ref<string | null>(contractAddress)
const { userRole, refreshRole } = useContractRole(selectedContract)

// Lifecycle: Fetch logs, role, and contract data on mount
onMounted(async () => {
  if (!state.value.history.length && !state.value.loading) {
    await fetchContractLogs(contractAddress)
  }
  await refreshRole()
  await trade.loadContractData(contractAddress)
})

// Refresh all
const refreshAll = async () => {
  state.value.history = []
  state.value.finished = false
  state.value.lastTimestamp = undefined
  await fetchContractLogs(contractAddress)
  await trade.loadContractData(contractAddress)
  await refreshRole()
}
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
    
    <!-- Contract Info -->
    <ContractInfo :address="contractAddress" chain="Sepolia" />

    <!-- User Role Info -->
    <RoleInfo :role="userRole ?? 'none'" />

    <!-- Contract Stepper -->
    <ContractStepper
      :current-stage="trade.currentStage.value"
      :user-role="trade.userRole.value"
      :importer-signed="trade.stepStatus.sign.importer"
      :exporter-signed="trade.stepStatus.sign.exporter"
      :deposit-done="trade.stepStatus.deposit"
    />

    <!-- Contract Action Buttons -->
    <ContractActionButtons
      :loading="trade.loadingButton.value"
      :step-status="trade.stepStatus"
      :sign-completed="trade.signCompleted.value"
      :is-admin="trade.isAdmin.value"
      :is-importer="trade.isImporter.value"
      :is-exporter="trade.isExporter.value"
      :can-deploy="trade.canDeploy.value"
      :can-sign="trade.canSign.value"
      :can-deposit="trade.canDeposit.value"
      :can-start-shipping="trade.canStartShipping.value"
      :can-complete="trade.canComplete.value"
      :can-cancel="trade.canCancel.value"
      @deploy="async () => { await trade.handleDeploy(); await refreshAll() }"
      @sign="async () => { await trade.handleSign(); await refreshAll() }"
      @deposit="async () => { await trade.handleDeposit(); await refreshAll() }"
      @start-shipping="async () => { await trade.handleStartShipping(); await refreshAll() }"
      @complete="async () => { await trade.handleComplete(); await refreshAll() }"
      @cancel="async () => { await trade.handleCancel(); await refreshAll() }"
    />

    <!-- Contract Logs -->
    <ContractLogs :contractAddress="contractAddress" />
    
  </div>
</template>
