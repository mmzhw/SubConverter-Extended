<template>
  <div class="bottom-bar">
    <el-button class="grow" type="primary">…</el-button>
    <el-button>…</el-button>
  </div>
</template>

<style scoped>
.bottom-bar { display: none; }
@media (max-width: 767px) {
  .bottom-bar {
    display: flex; gap: 8px; position: fixed; left: 0; right: 0; bottom: 0;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--surface-strong); border-top: 1px solid var(--surface-border); z-index: 100;
  }
  .grow { flex: 1; }
}
</style>
