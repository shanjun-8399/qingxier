<template><text class="tag" :class="{ danger: !ok }">{{ text }}</text></template>
<script setup lang="ts">
defineProps<{ text: string; ok?: boolean }>();
</script>
