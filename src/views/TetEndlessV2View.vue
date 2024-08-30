<script setup lang="ts">
import TetGameV2 from '../components/TetGameV2.vue';
import { useEndlessGameVariablesStore } from '../stores/stores'
import { ref, onMounted } from 'vue';

const gameVariablesStore = useEndlessGameVariablesStore();
const tetGame = ref();

onMounted(() => {
});
</script>

<template>
  <div class="game-container">
    <KeepAlive>
      <TetGameV2/>
    </KeepAlive>
  </div>
</template>

<style scoped>
.game-container {
  position: relative;
  width: 100%;

  display: flex;
  padding-left: 30px;
}
</style>