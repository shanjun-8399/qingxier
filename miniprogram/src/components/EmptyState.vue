<template><view class="card muted">{{ text }}</view></template>
<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: '暂无数据' });
</script>
