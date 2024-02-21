<script setup lang="ts">
import * as PIXI from "pixi.js";
import { onMounted, onUnmounted } from "vue";
import type { PixiMatrix } from "vue3-pixi";

let container;
let pixiapp: PIXI.Application<HTMLCanvasElement>;

let appHeight: number;
let appWidth: number;
let fieldWidth: number;

let field: PIXI.Graphics;
let grid: PIXI.Graphics;
let blocks: PIXI.Graphics;

let blocksData: number[][];

let tex: { [key: string]: PIXI.Texture } = {};
const blockTexId = ["bRed", "bOrange", "bYellow", "bGreen", "bBlue", "bCyan", "bPurple", "bGray"];

let blocksMatrix: PIXI.Matrix;

onMounted(async () => {
  container = document.getElementById("tetgame");
  pixiapp = new PIXI.Application<HTMLCanvasElement>({
    resizeTo: container!,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  container!.appendChild(pixiapp.view);

  appWidth = parseFloat(pixiapp.view.style.width);
  appHeight = parseFloat(pixiapp.view.style.height);
  fieldWidth = appHeight * 0.4;

  const blockTexSrc = ["red", "orange", "yellow", "green", "blue", "cyan", "purple", "gray"];
  for (let i = 0; i <= 7; i++) {
    tex[blockTexId[i]] = await PIXI.Assets.load(`/img/game/${blockTexSrc[i]}.png`);
  }

  initDrawing();
});

onUnmounted(() => {
  setTimeout(destroy, 250);
});

function destroy() {
  container!.removeChild(pixiapp.view);
  pixiapp.destroy(true, { children: true });
}

function initDrawing() {
  field = new PIXI.Graphics();
  grid = new PIXI.Graphics();
  blocks = new PIXI.Graphics();
  blocksData = Array(40).fill(undefined).map(() => Array(10).fill(0));

  blocksMatrix = calcBlocksMatrix();

  pixiapp.stage.addChild(field);
  field.addChild(grid);
  field.addChild(blocks);

  drawField();
  drawGrid();

  refreshBlocks();

  pixiapp.ticker.add(update);
}

function update(delta: number) {
  refreshBlocks();
}

function calcBlocksMatrix(): PIXI.Matrix {
  let gWidth = fieldWidth / 10;

  let texWidth = tex[blockTexId[0]].width;
  let applyScale = gWidth / texWidth;

  return new PIXI.Matrix(applyScale, 0, 0, applyScale, 0, 0);
}

function drawField() {
  field.position.set(appWidth / 2, appHeight / 2);
  let width = fieldWidth;
  let height = fieldWidth * 2;

  field.beginFill(0x111111);
  field.drawRect(-width / 2, -height / 2, width, height);
}

function drawGrid() {
  let fWidth = fieldWidth;
  let fHeight = fieldWidth * 2;
  let gWidth = fieldWidth / 10;

  let top = -fHeight / 2;
  let bottom = fHeight / 2;
  let left = -fWidth / 2;
  let right = fWidth / 2;

  grid.lineStyle(1.6, 0x333333);

  for (let i = -4; i <= 4; i++) {
    let x = i * gWidth;
    grid.moveTo(x, bottom);
    grid.lineTo(x, top);
  }
  for (let i = -9; i <= 9; i++) {
    let y = i * gWidth;
    grid.moveTo(left, y);
    grid.lineTo(right, y);
  }

  grid.lineStyle(4.8, 0x779988);
  grid.moveTo(0, top).lineTo(right, top).lineTo(right, bottom)
    .lineTo(left, bottom).lineTo(left, top).lineTo(0, top);
}

function drawBlock(blockId: number, ix: number, iy: number) {
  let fWidth = fieldWidth;
  let fHeight = fieldWidth * 2;
  let gWidth = fieldWidth / 10;

  let bottom = fHeight / 2;
  let left = -fWidth / 2;

  if (1 <= blockId && blockId <= 8) {
    let texId = blockId - 1;
    let x = left + gWidth * ix;
    let y = bottom - gWidth * (iy + 1);

    blocks.beginTextureFill({ texture: tex[blockTexId[texId]], matrix: blocksMatrix });
    blocks.drawRect(x, y, gWidth, gWidth);
  }
}

function drawFieldBlocks() {
  for (let ix = 0; ix <= 9; ix++) {
    for (let iy = 0; iy <= 22; iy++) {
      let blockId = blocksData[iy][ix];
      drawBlock(blockId, ix, iy);
    }
  }
}

function refreshBlocks() {
  blocks.clear();
  drawFieldBlocks();
}
</script>

<template>
  <div id="tetgame"></div>
</template>

<style scoped>
#tetgame {
  user-select: none;
  min-height: 90vh;
  min-width: 100vh;

  border: solid 3px #cde;
}
</style>