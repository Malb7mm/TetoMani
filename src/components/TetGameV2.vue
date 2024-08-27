<script setup lang="ts">
import { PieceBag } from './v2/v2logic';
import { BagSets } from './v2/v2consts';
import { InputReceiver } from './v2/v2inputreceiver';
import { ref } from 'vue';

let piecebag = new PieceBag("[@:6][@]~", BagSets.bag7);
piecebag.elementRoot.generateQueue();

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

let inputReceiver = new InputReceiver();
let inputString = ref("test");
function update() {
  let inputs = inputReceiver.getAllActive();
  inputString.value = Array.from(inputs).join(", ");
  requestAnimationFrame(update);
}
update();
</script>

<template>
  <div id="tetgame">
  </div>
  <div id="debugref" v-if="true">
    <div @click="showBag()">バッグ出力</div>
    <div @click="pickNext()">ピック</div>
    <div @click="getNexts()">ネクスト</div>
    <div @click="getVirtualNexts()">仮想ネクスト</div>
    {{ inputString }}
  </div>
</template>

<style scoped>
#tetgame {
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