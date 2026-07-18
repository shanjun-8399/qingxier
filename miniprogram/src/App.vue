<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';
onLaunch(() => { useAuthStore().restore(); });
</script>
<style>
page{background:#f5f7fa;color:#182230;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{padding:28rpx}.card{background:#fff;border-radius:24rpx;padding:28rpx;margin-bottom:24rpx;box-shadow:0 8rpx 28rpx rgba(24,34,48,.06)}.title{font-size:38rpx;font-weight:700}.subtitle{font-size:26rpx;color:#667085}.row{display:flex;align-items:center;justify-content:space-between;gap:20rpx}.btn{background:#1f6feb;color:#fff;border-radius:18rpx;padding:20rpx 28rpx;text-align:center}.btn.secondary{background:#e8f0fe;color:#1f6feb}.input{background:#f7f8fa;border-radius:14rpx;padding:20rpx;margin:12rpx 0}.tag{padding:8rpx 14rpx;border-radius:999rpx;background:#eef4ff;color:#1f6feb;font-size:24rpx}.danger{color:#d92d20}.list-item{padding:22rpx 0;border-bottom:1rpx solid #eef0f3}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18rpx}.metric{font-size:42rpx;font-weight:700}.muted{color:#98a2b3}.section-title{font-size:30rpx;font-weight:650;margin-bottom:16rpx}
</style>
