<script setup lang="ts">
import TetGame from '../components/TetGame.vue';
import { useEndlessGameVariablesStore } from '../stores/stores'
import { ref, onMounted } from 'vue';

const gameVariablesStore = useEndlessGameVariablesStore();

const tetGame = ref();
let isLoadingDialogVisible = ref(false);
let isInitDialogVisible = ref(false);
let isResumeDialogVisible = ref(false);
let isGameoverDialogVisible = ref(false);

onMounted(() => {
  isLoadingDialogVisible.value = true;
});

function onLoadedTetGame() {
  isLoadingDialogVisible.value = false;

  if (gameVariablesStore.gameState == "playing")
    isResumeDialogVisible.value = true;
  else
    isInitDialogVisible.value = true;
}

function gameover() {
  isGameoverDialogVisible.value = true;
}

function start() {
  tetGame.value.initGame();
  isInitDialogVisible.value = false;
}

function resume() {
  tetGame.value.resumeGame();
  isResumeDialogVisible.value = false;
}

function restart() {
  tetGame.value.initGame();
  isGameoverDialogVisible.value = false;
}
</script>

<template>
  <div class="game-container">
    <KeepAlive>
      <TetGame id="game-main" ref="tetGame" @load="onLoadedTetGame()" @gameover="gameover()"/>
    </KeepAlive>
    <Transition name="dialog">
      <div>
        <div id="loading-dialog" class="dialog" v-if="isLoadingDialogVisible">
          <p style="font-weight: 600;">エンドレスモード</p>
          <p style="font-size: 15px;">ロード中……</p>
        </div>
        <div id="init-dialog" class="dialog" v-if="isInitDialogVisible" v-on:click="start()">
          <p style="font-weight: 600;">エンドレスモード</p>
          <p style="font-size: 15px;">クリックして新規ゲームを開始</p>
        </div>
        <div id="resume-dialog" class="dialog" v-if="isResumeDialogVisible" v-on:click="resume()">
          <p style="font-weight: 600;">エンドレスモード</p>
          <p style="font-size: 15px;">クリックしてゲームを再開</p>
        </div>
        <div id="gameover-dialog" class="dialog" v-if="isGameoverDialogVisible" v-on:click="restart()">
          <p style="font-weight: 600;">ゲームオーバー！</p>
          <p style="font-size: 15px;">クリックして新規ゲームを開始</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dialog-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dialog-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.dialog-leave-to {
  opacity: 0;
  transform: translateY(3%);
}

.game-container {
  position: relative;
  width: 100%;

  display: flex;
  padding-left: 30px;
}

.dialog {
  position: absolute;
  left: 30vh;
  top: 28vh;
  width: 50vh;
  height: 30vh;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  font-family: 'Anta', 'M PLUS 1';
  font-weight: 600;
  font-size: 22px;
  color: #fff;
  text-shadow: 0px 0px 4px #000;

  background: linear-gradient(120deg, #dfe6, #dce6);
  box-shadow: 0px 0px 20px #0008;
}
</style>