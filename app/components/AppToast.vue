<script setup lang="ts">
const toast = useAppToast()
</script>

<template>
  <slot v-bind="toast" />
</template>
