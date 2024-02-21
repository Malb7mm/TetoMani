<script setup lang="ts">
import * as PIXI from "pixi.js";
import { onMounted, onUnmounted } from "vue";

let container;
let pixiapp: PIXI.Application<HTMLCanvasElement>;

const NEXT_COUNT = 5;

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

class Shape {
  shapes: {x: number, y: number}[][];

  constructor(shapeCoords: number[][], width: number) {
    this.shapes = Array(4).fill(undefined).map(() => {
      return Array(4).fill(undefined).map(() => {
        return {x: 0, y: 0}
      })
    });

    for (let i = 0; i < 4; i++) {
      let x = shapeCoords[i][0];
      let y = shapeCoords[i][1];
      let max = (width == 3) ? 2 : 3;

      this.shapes[0][i] = {
        x: x,
        y: 3 - y
      }
      this.shapes[1][i] = {
        x: max - y,
        y: 3 - x
      }
      this.shapes[2][i] = {
        x: max - x,
        y: 3 - (max - y)
      }
      this.shapes[3][i] = {
        x: y,
        y: 3 - (max - x)
      }
    }
  }

  get(rotation: number): {x: number, y: number}[] {
    return this.shapes[rotation];
  }
}

let shapes: {[key: string]: Shape} = {
  I: new Shape([[0, 1], [1, 1], [2, 1], [3, 1]], 4),
  O: new Shape([[1, 1], [1, 2], [2, 1], [2, 2]], 2),
  T: new Shape([[1, 0], [0, 1], [1, 1], [2, 1]], 3),
  L: new Shape([[2, 0], [0, 1], [1, 1], [2, 1]], 3),
  J: new Shape([[0, 0], [0, 1], [1, 1], [2, 1]], 3),
  S: new Shape([[1, 0], [2, 0], [0, 1], [1, 1]], 3),
  Z: new Shape([[0, 0], [1, 0], [1, 1], [2, 1]], 3),
}

let shapeList = ["Z", "L", "O", "S", "I", "J", "T"];
let shapeIds: {[key: string]: number} = {"Z": 1, "L": 2, "O": 3, "S": 4, "I": 5, "J": 6, "T": 7}

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

function drawBlock(blockId: number, bx: number, by: number) {
  let fWidth = fieldWidth;
  let fHeight = fieldWidth * 2;
  let gWidth = fieldWidth / 10;

  let bottom = fHeight / 2;
  let left = -fWidth / 2;

  if (1 <= blockId && blockId <= 8) {
    let texId = blockId - 1;
    let x = left + gWidth * bx;
    let y = bottom - gWidth * (by + 1);

    blocks.beginTextureFill({ texture: tex[blockTexId[texId]], matrix: blocksMatrix });
    blocks.drawRect(x, y, gWidth, gWidth);
  }
}

function drawFieldBlocks() {
  for (let ix = 0; ix < 10; ix++) {
    for (let iy = 0; iy < 23; iy++) {
      let blockId = blocksData[iy][ix];
      drawBlock(blockId, ix, iy);
    }
  }
}

function drawPiece(shapeName: string, px: number, py: number, rotation: number) {
  let shape = shapes[shapeName].get(rotation);
  
  for (let i = 0; i < 4; i++) {
    drawBlock(shapeIds[shapeName], px + shape[i].x, py + shape[i].y);
  }
}

function refreshBlocks() {
  blocks.clear();
  drawFieldBlocks();
}

class PieceBag {
  pieces: string[];
  count: number;

  constructor() {
    this.pieces = [];
    this.count = 0;
    this.generate();
  }

  isEmpty(): boolean {
    return this.count == 0;
  }

  generate() {
    this.pieces = [...shapeList];
    for (let i = shapeList.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = this.pieces[i];
      this.pieces[i] = this.pieces[j];
      this.pieces[j] = tmp;
    }
    this.count = 7;
  }

  dequeue(): string | undefined {
    this.count--;
    return this.pieces.shift();
  }

  enqueue(bag: PieceBag): void;
  enqueue(piece: string): void;
  enqueue(pieces: PieceBag | string) {
    if (pieces instanceof PieceBag) {
      this.pieces.concat(bag.pieces);
      this.count += bag.count;
    } else {
      this.pieces.push(pieces);
      this.count += 1;
    }
  }
}

let nexts: PieceBag;
let bag: PieceBag;

function pullNextPiece(): string {
  let result = nexts.dequeue();
  if (result === undefined)
    throw Error;
  return result;
}

function getNextList(): string[] {
  if (nexts.count < NEXT_COUNT) {
    bag.generate();
    nexts.enqueue(bag);
  }
  return nexts.pieces.slice(0, NEXT_COUNT);
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