<script setup lang="ts">
import SideBar from "./components/SideBar.vue";
import InputDaemon from "./components/InputDaemon.vue"
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="outer">
    <SideBar class="sidebar" />
    <div class="content">
      <RouterView v-slot="{ Component }">
        <Transition name="router">
          <component :is="Component"/>
        </Transition>
      </RouterView>
    </div>
    <InputDaemon />
  </div>
</template>

<style scoped>
.router-enter-active {
  transition: opacity 0.2s ease;
}

.router-enter-from,
.router-leave-from {
  opacity: 0;
}

.outer {
  --sidebar-width: 260px;

  position: absolute;
  min-width: 100vw;
  left: 0;
  top: 0;

  display: flex;
  align-items: center;

  background: linear-gradient(120deg, #fff, #e0e8e0);
}

.sidebar {
  width: var(--sidebar-width);
}

.content {
  width: calc(100vw - var(--sidebar-width));
}
</style>