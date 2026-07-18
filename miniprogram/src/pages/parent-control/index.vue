<template>
  <view class="page">
    <AppCard title="家长控制">
      <view class="list-item">最大音量 {{ form.maxVolume }}%</view>
      <slider :value="form.maxVolume" min="0" max="100" @change="onVolumeChange" />
      <label><switch :checked="form.dialogRecordEnabled" @change="onDialogChange" />允许查看最近20条对话</label>
      <label><switch :checked="form.heatingEnabled" @change="onHeatingChange" />允许恒温</label>
      <button class="btn" @click="save">保存设置</button>
      <button class="btn secondary" @click="sleep">远程哄睡</button>
    </AppCard>
  </view>
</template>
<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import AppCard from '@/components/AppCard.vue';
import { useDeviceStore } from '@/stores/device';
import { qingxierApi } from '@/services/api';
const d = useDeviceStore();
const form = reactive<any>({ maxVolume: 70, dialogRecordEnabled: true, heatingEnabled: true });
onMounted(async () => { await d.load(); Object.assign(form, await qingxierApi.parentControl(d.currentId)); });
function onVolumeChange(event: any) { form.maxVolume = Number(event.detail.value); }
function onDialogChange(event: any) { form.dialogRecordEnabled = Boolean(event.detail.value); }
function onHeatingChange(event: any) { form.heatingEnabled = Boolean(event.detail.value); }
async function save() { Object.assign(form, await qingxierApi.updateParentControl(d.currentId, form)); uni.showToast({ title: '已保存' }); }
async function sleep() { await qingxierApi.sleepMode(d.currentId); uni.showToast({ title: '已进入哄睡模式' }); }
</script>
