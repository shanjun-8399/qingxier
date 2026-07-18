<template><div class="panel"><div class="muted">{{label}}</div><div class="metric">{{value}}</div></div></template><script setup lang="ts">defineProps<{label:string;value:string|number}>();</script>
