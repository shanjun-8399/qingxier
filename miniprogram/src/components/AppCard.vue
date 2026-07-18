<template>
  <view class="card">
    <view v-if="title" class="section-title">{{ title }}</view>
    <slot />
  </view>
</template>
<script setup lang="ts">
defineProps<{ title?: string }>();
</script>
