<script setup lang="ts">
import { PieceBag } from './v2/v2logic';
import { BagSets, Blocks, ShapeSets } from './v2/v2consts';
import { InputReceiver } from './v2/v2inputreceiver';
import { ref, onMounted } from 'vue';
import { Drawer } from './v2/v2drawer';
import { XY } from './v2/v2logic';
import { GameCycle } from './v2/v2gamecycle';
import { GameSettings } from './v2/v2settings';
import { PlayerSettings } from './v2/v2playersettings';
import { FpsCounter } from './scripts/fpscounter';

let piecebag = new PieceBag("[@]~", BagSets.bag7);
piecebag.elementRoot.generateQueue();

let inputString = ref("");

function showBag() {
  console.log(piecebag);
}
function pickNext() {
  console.log(piecebag.pickNext());
}
function getNexts() {
  console.log(piecebag.getNexts(5));
}
function getVirtualNexts() {
  console.log(piecebag.getVirtualNexts(2));
}

let cycle: GameCycle;
onMounted(async () => {
  let container = document.getElementById("tetgamev2")!;
  let drawer = new Drawer(container, Blocks.empty, Blocks.neutral);
  await drawer.init();
  await drawer.loadAssets({
    progress: (percentage, next) => {
      console.log(`${percentage.toFixed(1)}% done, next: ${next}`);
    },
    callback: () => {},
  });

  let ps = new PlayerSettings();
  ps.handlings.autoRepeatRate_Frame = 0;
  ps.handlings.delayedAutoShift_Frame = 7;
  cycle = GameCycle.createInstance(new GameSettings(), ps, drawer);

  let fpsCounter = new FpsCounter();
  drawLoop();
  function drawLoop() {
    cycle.drawLoop();
    fpsCounter.log();
    inputString.value = Array.from(cycle.inputReceiver.getAllActive()).join(", ");
  }
  let proc = setInterval(() => cycle.processLoop(), 5);
  let draw = setInterval(() => drawLoop(), 16.7);
});

function getFieldArray() {
  console.log(cycle.field.fieldData);
}

function getDrawerBlockElements() {
  console.log(cycle.drawer.getBlockElements());
}

function getHoldQueue() {
  console.log(cycle.fieldPieceController.getHoldQueue());
}
</script>

<template>
  <div id="tetgamev2">
  </div>
  <div id="debugref" v-if="true">
    <div @click="showBag()">バッグ出力</div>
    <div @click="pickNext()">ピック</div>
    <div @click="getNexts()">ネクスト</div>
    <div @click="getVirtualNexts()">仮想ネクスト</div>
    <div @click="getFieldArray()">フィールド配列出力</div>
    <div @click="getDrawerBlockElements()">ドロワーのブロック配列出力</div>
    <div @click="getHoldQueue()">ホールド</div>
    {{ inputString }}
  </div>
</template>

<style scoped>
#tetgamev2 {
  user-select: none;
  min-height: 90vh;
  min-width: 100vh;
}

#debugref {
  font-family: 'M PLUS 1';
  font-weight: 400;

  right: 0;
}
</style>