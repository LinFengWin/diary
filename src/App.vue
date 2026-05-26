<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { flushPendingSync, hasPendingSync, mergeLatestFromServer } from '@/utils/storage'

function autoSync() {
  mergeLatestFromServer().catch(() => {})
  if (hasPendingSync()) {
    flushPendingSync().catch(() => {})
  }
}

onLaunch(() => {
  const firstOpen = !uni.getStorageSync('moo_vibe_bootstrapped')
  if (firstOpen) {
    uni.setStorageSync('moo_vibe_bootstrapped', true)
  }
  autoSync()
})

onShow(() => {
  autoSync()
})
</script>

<style>
page {
  background: #f8faf9;
  color: #333333;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
}

button {
  padding: 0;
  margin: 0;
  line-height: 1;
  background: transparent;
}

button::after {
  border: 0;
}

@media screen and (min-width: 768px) {
  :root {
    --moo-web-width: 430px;
  }

  html,
  body,
  #app {
    min-height: 100%;
    background:
      radial-gradient(circle at 18% 16%, rgba(247, 220, 227, 0.55), transparent 28%),
      radial-gradient(circle at 82% 10%, rgba(220, 239, 230, 0.65), transparent 26%),
      #edf3f5;
  }

  uni-page-body,
  uni-page-wrapper,
  uni-page {
    width: var(--moo-web-width) !important;
    max-width: var(--moo-web-width);
    margin-left: auto;
    margin-right: auto;
    overflow-x: hidden;
    background: #f8faf9;
  }

  uni-page-body {
    min-height: 100vh;
    box-shadow: 0 24px 80px rgba(61, 77, 92, 0.13);
  }

  uni-tabbar.uni-tabbar-bottom,
  .uni-tabbar-bottom {
    position: fixed !important;
    left: 50% !important;
    right: auto !important;
    bottom: 0 !important;
    width: var(--moo-web-width) !important;
    max-width: var(--moo-web-width) !important;
    transform: translateX(-50%) !important;
    z-index: 9999 !important;
    display: block !important;
  }

  uni-tabbar.uni-tabbar-bottom .uni-tabbar,
  .uni-tabbar-bottom .uni-tabbar {
    position: static !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    width: 100% !important;
    max-width: none !important;
    height: 64px !important;
    transform: none !important;
    display: flex !important;
    background: #ffffff !important;
    box-shadow: 0 -10px 30px rgba(61, 77, 92, 0.08);
  }

  .uni-tabbar-bottom .uni-tabbar__item {
    min-height: 64px !important;
  }

  .fab {
    right: max(34px, calc((100vw - var(--moo-web-width)) / 2 + 28px)) !important;
    bottom: 86px !important;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(111, 149, 191, 0.28);
  }
}

@media screen and (min-width: 768px) and (max-width: 900px) {
  :root {
    --moo-web-width: min(430px, calc(100vw - 32px));
  }
}

@media screen and (min-width: 1180px) {
  uni-page-body,
  uni-page-wrapper,
  uni-page-refresh,
  uni-page {
    border-left: 1px solid rgba(111, 149, 191, 0.08);
    border-right: 1px solid rgba(111, 149, 191, 0.08);
  }
}

@media screen and (max-width: 380px) {
  .quick-row {
    grid-template-columns: 1fr !important;
  }
}
</style>
