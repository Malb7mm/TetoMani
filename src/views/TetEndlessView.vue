<script setup lang="ts">
import TetGame from '../components/TetGame.vue';
</script>

<template>
  <div class="game-container">
    <KeepAlive>
      <TetGame />
    </KeepAlive>
  </div>
</template>

<style scoped>
.game-container {
  width: 100%;

  display: flex;
  padding-left: 30px;
}
</style>