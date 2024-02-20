<script setup lang="ts">
import SideBar from "./components/SideBar.vue";
import TetGame from "./components/TetGame.vue";
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="outer">
    <SideBar class="sidebar" />
    <div class="content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.outer {
  --sidebar-width: 260px;

  position: absolute;
  width: 100vw;
  left: 0;
  top: 0;

  display: flex;
  align-items: center;

  background: linear-gradient(120deg, #fff, #f2f6f2);
}

.sidebar {
  width: var(--sidebar-width);
}

.contents {
  width: calc(100vw - var(--sidebar-width));
}

.tetgame {
  margin-left: 260px;
}
</style>