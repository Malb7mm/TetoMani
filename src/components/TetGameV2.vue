<script setup lang="ts">
import { PieceBag } from './v2/v2logic';
import { BagSets, Blocks, ShapeSets } from './v2/v2consts';
import { InputReceiver } from './v2/v2inputreceiver';
import { ref, onMounted } from 'vue';
import { Drawer } from './v2/v2drawer';

let piecebag = new PieceBag("[@]~", BagSets.bag7);
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

onMounted(async () => {
  let container = document.getElementById("tetgamev2")!;
  let drawer = new Drawer(container, Blocks.empty, ShapeSets.standard);
  await drawer.init();
  await drawer.loadAssets();
  drawer.setNextAndHoldCount(5, 1);
  let fieldData = [
    "OO.LLLIJJJ".split(""),
    "OO.SSLIJZZ".split(""),
    "J...SSIZZI".split(""),
    "J..TTTIOOI".split(""),
    "JJ.LT..OOI".split(""),
    "...L.....I".split(""),
    "..LL......".split(""),
  ];
  drawer.updateFieldBlocks(fieldData[0].map((_, colIndex) => fieldData.map(row => row[colIndex])));
  setTimeout(() => {
    fieldData = [
      "OO.LLLIJJJ".split(""),
      "OO.SSLIJZZ".split(""),
      "J...SSIZZI".split(""),
      "J..TTTIOOI".split(""),
      "JJ.LTSZOOI".split(""),
      "...LSSZZ.I".split(""),
      "..LLS..Z..".split(""),
    ];
    drawer.updateFieldBlocks(fieldData[0].map((_, colIndex) => fieldData.map(row => row[colIndex])));
  }, 4000);
  setTimeout(() => {
    fieldData = [
      "OO.LLLIJJJ".split(""),
      "OOTSSLIJZZ".split(""),
      "JTTTSSIZZI".split(""),
      "J..TTTIOOI".split(""),
      "JJ.LTSZOOI".split(""),
      "...LSSZZ.I".split(""),
      "..LLS..Z..".split(""),
    ];
    drawer.updateFieldBlocks(fieldData[0].map((_, colIndex) => fieldData.map(row => row[colIndex])));
  }, 6000);
  setTimeout(() => {
    fieldData = [
      "OO.LLLIJJJ".split(""),
      "J..TTTIOOI".split(""),
      "JJ.LTSZOOI".split(""),
      "...LSSZZ.I".split(""),
      "..LLS..Z..".split(""),
      "..........".split(""),
      "..........".split(""),
    ];
    drawer.updateFieldBlocks(fieldData[0].map((_, colIndex) => fieldData.map(row => row[colIndex])));
  }, 8000);
  drawer.updateNextQueue(["I", "S", "J", "T", "O",]);
  drawer.updateHoldQueue(["Z"]);
});

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
  <div id="tetgamev2">
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