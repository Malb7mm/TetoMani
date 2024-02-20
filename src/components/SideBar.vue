<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="sidebar">
    <div class="title-text">TetoMani</div>
    <div class="dot"></div>

    <nav class="nav-top">
      <RouterLink to="/">ホーム</RouterLink>
      <RouterLink to="/config">設定</RouterLink>
    </nav>

    <div class="dot"></div>

    <nav class="nav-mode">
      <RouterLink to="/play/solo">エンドレス</RouterLink>
      <RouterLink to="/play/szlj">SZ・LJクイズ</RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.sidebar {
  user-select: none;
  height: 100vh;

  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;

  background: linear-gradient(120deg, #234, #282646);
}

.sidebar-icon {
  width: 16px;
}

.title-text {
  font-family: 'Anta';
  font-size: 25px;
  margin-bottom: -6px;

  color: white;
}

.dot {
  margin: 0px;
}

.dot::before {
  content: "・";
  font-size: 16px;
  color: #567;

  text-shadow: 0px 0px 3px black;
}

nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0px;

  font-family: 'Anta', 'M PLUS 1';
  font-size: 16px;

  color: white;
}

.nav-top a {
  color: #8a9;
  margin: 4px;
  width: 200px;
  
  padding-left: 20px;
  padding-top: 1px;
  padding-bottom: 0px;

  background: linear-gradient(70deg, #345, #364656);
  border: solid 1px #567;
  border-left: solid 7px #567;
}

.nav-top a:hover {
  background: linear-gradient(70deg, #456, #465666);
}

.nav-mode a {
  color: #a97;
  margin: 4px;
  width: 200px;
  
  padding-left: 20px;
  padding-top: 1px;
  padding-bottom: 0px;

  background: linear-gradient(70deg, #443, #606040);
  border: solid 1px #774;
  border-left: solid 7px #774;
}

.nav-mode a:hover {
  background: linear-gradient(70deg, #554, #707050);
}
</style>