<script setup lang="ts">
import * as PIXI from "pixi.js";
import { onMounted, onUnmounted } from "vue";

type xy = {x: number, y: number};

let container;
let pixiapp: PIXI.Application<HTMLCanvasElement>;

const FIELD_HEIGHT_SCALE = 0.8;
const NEXT_COUNT = 5;
const INFO_PIECE_HEIGHT_SCALE = 0.13;
const INFO_DISTANCE_PX = 10;
const INFO_PADDING_PX = 10;

let appHeight: number;
let appWidth: number;
let fieldWidth: number;
let fieldHeight: number;

let field: PIXI.Graphics;
let grid: PIXI.Graphics;
let blocks: PIXI.Graphics;

let uis: PIXI.Graphics;
let infoBlocks: PIXI.Container;

let blocksData: number[][];

let tex: { [key: string]: PIXI.Texture } = {};
const blockTexId = ["bRed", "bOrange", "bYellow", "bGreen", "bBlue", "bCyan", "bPurple", "bGray"];

let blocksMatrix: PIXI.Matrix;

class Shape {
  shapes: xy[][];
  center: xy;

  constructor(shapeCoords: number[][], width: number, center: xy) {
    this.center = center;
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

  get(rotation: number): xy[] {
    return this.shapes[rotation];
  }
}

let shapes: {[key: string]: Shape} = {
  I: new Shape([[0, 1], [1, 1], [2, 1], [3, 1]], 4, {x: 2, y: 0.5}),
  O: new Shape([[1, 1], [1, 2], [2, 1], [2, 2]], 2, {x: 2, y: 0}),
  T: new Shape([[1, 0], [0, 1], [1, 1], [2, 1]], 3, {x: 1.5, y: 1}),
  L: new Shape([[2, 0], [0, 1], [1, 1], [2, 1]], 3, {x: 1.5, y: 1}),
  J: new Shape([[0, 0], [0, 1], [1, 1], [2, 1]], 3, {x: 1.5, y: 1}),
  S: new Shape([[1, 0], [2, 0], [0, 1], [1, 1]], 3, {x: 1.5, y: 1}),
  Z: new Shape([[0, 0], [1, 0], [1, 1], [2, 1]], 3, {x: 1.5, y: 1}),
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
  fieldWidth = appHeight * FIELD_HEIGHT_SCALE / 2;
  fieldHeight = fieldWidth * 2;

  const blockTexSrc = ["red", "orange", "yellow", "green", "blue", "cyan", "purple", "gray"];
  for (let i = 0; i <= 7; i++) {
    tex[blockTexId[i]] = await PIXI.Assets.load(`/img/game/${blockTexSrc[i]}.png`);
  }

  init();
});

onUnmounted(() => {
  setTimeout(destroy, 250);
});

function destroy() {
  container!.removeChild(pixiapp.view);
  pixiapp.destroy(true, { children: true });
}

function init() {
  field = new PIXI.Graphics();
  grid = new PIXI.Graphics();
  blocks = new PIXI.Graphics();
  blocksData = Array(40).fill(undefined).map(() => Array(10).fill(0));

  uis = new PIXI.Graphics();
  infoBlocks = new PIXI.Graphics();

  pixiapp.stage.addChild(field);
  field.addChild(grid);
  field.addChild(blocks);
  field.addChild(uis);
  uis.addChild(infoBlocks);

  field.position.set(appWidth / 2, appHeight / 2);

  blocksMatrix = calcBlocksMatrix();

  drawField();
  drawGrid();
  drawUIField();

  nextsBag = new PieceBag();
  genBag = new PieceBag();

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
  let width = fieldWidth;
  let height = fieldHeight;

  field.beginFill(0x111111);
  field.drawRect(-width / 2, -height / 2, width, height);
}

function drawGrid() {
  let fWidth = fieldWidth;
  let fHeight = fieldHeight;
  let gWidth = fieldWidth / 10;

  let left = -fWidth / 2;
  let top = -fHeight / 2;
  let right = fWidth / 2;
  let bottom = fHeight / 2;

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

function drawUIField() {
  let nfWidth = fieldHeight * INFO_PIECE_HEIGHT_SCALE * (4 / 3) + INFO_PADDING_PX * 2;
  let nfHeight = fieldHeight * INFO_PIECE_HEIGHT_SCALE * 5 + INFO_PADDING_PX * 2;

  let nfLeft = fieldWidth / 2 + INFO_DISTANCE_PX;
  let nfTop = -fieldHeight / 2;
  let nfRight = nfLeft + nfWidth;
  let nfBottom = nfTop + nfHeight;
  let nfTopCenterX = (nfLeft + nfRight) / 2;

  uis.beginFill(0x111111);
  uis.drawRect(nfLeft, nfTop, nfWidth, nfHeight);

  uis.lineStyle(4.8, 0x779988);
  uis.moveTo(nfTopCenterX, nfTop).lineTo(nfRight, nfTop).lineTo(nfRight, nfBottom)
    .lineTo(nfLeft, nfBottom).lineTo(nfLeft, nfTop).lineTo(nfTopCenterX, nfTop);

  let hWidth = nfWidth;
  let hHeight = fieldHeight * INFO_PIECE_HEIGHT_SCALE + INFO_PADDING_PX * 2;

  let hRight = -fieldWidth / 2 - INFO_DISTANCE_PX;
  let hTop = nfTop;
  let hLeft = hRight - hWidth;
  let hBottom = hTop + hHeight;
  let hTopCenterX = (hLeft + hRight) / 2;

  uis.beginFill(0x111111);
  uis.drawRect(hLeft, hTop, hWidth, hHeight);

  uis.lineStyle(4.8, 0x779988);
  uis.moveTo(hTopCenterX, hTop).lineTo(hRight, hTop).lineTo(hRight, hBottom)
    .lineTo(hLeft, hBottom).lineTo(hLeft, hTop).lineTo(hTopCenterX, hTop);
}

function drawBlock(blockId: number, bx: number, by: number) {
  let fWidth = fieldWidth;
  let fHeight = fieldHeight;
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

function createBlockSprite(blockId: number, bxPx: number, byPx: number, size: number): PIXI.Sprite | undefined {
  let result: PIXI.Sprite;

  if (1 <= blockId && blockId <= 8) {
    let texId = blockId - 1;

    result = new PIXI.Sprite(tex[blockTexId[texId]]);
    result.position.set(bxPx, byPx);
    result.width = size;
    result.height = size;
    return result;
  }

  return undefined;
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

function createPieceSprite(shapeName: string, pxPx: number, pyPx: number, rotation: number, size: number): PIXI.Container {
  let shape = shapes[shapeName].get(rotation);
  let center = shapes[shapeName].center;
  let result = new PIXI.Container();

  for (let i = 0; i < 4; i++) {
    let sprite = createBlockSprite(shapeIds[shapeName], 
    (-center.x + shape[i].x) * size,
    (3 - (-center.y + shape[i].y)) * size,
    size);

    if (sprite === undefined)
      throw Error();

    result.addChild(sprite);
  }
  result.position.set(pxPx, pyPx);

  return result;
}

function refreshBlocks() {
  blocks.clear();
  drawFieldBlocks();
  drawNextList();
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
      this.pieces.concat(genBag.pieces);
      this.count += genBag.count;
    } else {
      this.pieces.push(pieces);
      this.count += 1;
    }
  }
}

let nextsBag: PieceBag;
let genBag: PieceBag;

function pullNextPiece(): string {
  let result = nextsBag.dequeue();
  if (result === undefined)
    throw Error;
  return result;
}

function getNextList(): string[] {
  if (nextsBag.count < NEXT_COUNT) {
    genBag.generate();
    nextsBag.enqueue(genBag);
  }
  return nextsBag.pieces.slice(0, NEXT_COUNT);
}

function drawNextList() {
  let nexts = getNextList();

  let size = fieldHeight * INFO_PIECE_HEIGHT_SCALE / 3;
  let x = fieldWidth / 2 + INFO_DISTANCE_PX + INFO_PADDING_PX + size * 2;
  let top = -fieldHeight / 2;
  
  for (let i = 0; i < NEXT_COUNT; i++) {
    let shapeName = nexts[i];
    let y = top + i * (size * 3);

    let sprite = createPieceSprite(shapeName, x, y, 0, size);
    infoBlocks.addChild(sprite);
  }
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