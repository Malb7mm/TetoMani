<script setup lang="ts">
import * as PIXI from "pixi.js";
import { onMounted, onUnmounted, ref } from "vue";
import { useActionStateStore } from '../stores/stores'

const actionState = useActionStateStore();

class XY {
  x: number = 0;
  y: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class FpsCounter {
  fpsMeasureBegin: number = Date.now();
  fpsCount: number = 0;
  fpsValue: number = 0;

  get(): number {
    if (Date.now() - this.fpsMeasureBegin >= 1000) {
      this.fpsValue = this.fpsCount;
      this.fpsCount = 0;
      this.fpsMeasureBegin += 1000;
    }
    this.fpsCount++;
    return this.fpsValue;
  }
}

class Shape {
  shapes: XY[][];
  center: XY;

  constructor(shapeCoords: number[][], width: number, center: XY) {
    this.center = center;
    this.shapes = Array(4).fill(undefined).map(() => {
      return Array(4).fill(undefined).map(() => {
        return new XY(0, 0)
      })
    });

    for (let i = 0; i < 4; i++) {
      let x = shapeCoords[i][0];
      let y = shapeCoords[i][1];
      if (width == 2) {
        for (let j = 0; j < 4; j++) {
          this.shapes[j][i] = {
            x: x,
            y: 3 - y
          }
        }
      } else {
        let max = width - 1;

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
  }

  get(rotation: number): XY[] {
    return this.shapes[rotation];
  }
}

const shapes: { [key: string]: Shape } = {
  I: new Shape([[0, 1], [1, 1], [2, 1], [3, 1]], 4, { x: 2, y: 0.5 }),
  O: new Shape([[1, 0], [1, 1], [2, 0], [2, 1]], 2, { x: 2, y: 1 }),
  T: new Shape([[1, 0], [0, 1], [1, 1], [2, 1]], 3, { x: 1.5, y: 1 }),
  L: new Shape([[2, 0], [0, 1], [1, 1], [2, 1]], 3, { x: 1.5, y: 1 }),
  J: new Shape([[0, 0], [0, 1], [1, 1], [2, 1]], 3, { x: 1.5, y: 1 }),
  S: new Shape([[1, 0], [2, 0], [0, 1], [1, 1]], 3, { x: 1.5, y: 1 }),
  Z: new Shape([[0, 0], [1, 0], [1, 1], [2, 1]], 3, { x: 1.5, y: 1 }),
}

const shapeList = ["Z", "L", "O", "S", "I", "J", "T"];
const shapeIds: { [key: string]: number } = { "Z": 1, "L": 2, "O": 3, "S": 4, "I": 5, "J": 6, "T": 7 }

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
      this.pieces = this.pieces.concat(v.genBag.pieces);
      this.count += v.genBag.count;
    } else {
      this.pieces.push(pieces);
      this.count += 1;
    }
  }
}

class KickTable {
  cw: XY[][];
  ccw: XY[][];

  constructor(cw: XY[][], ccw: XY[][]) {
    this.cw = cw;
    this.ccw = ccw;
  }

  use(shapeName: string, px: number, py: number, rotation: number, dir: "cw" | "ccw"): { x: number, y: number, kick: number } | undefined {
    let table = (dir == "cw") ? this.cw : this.ccw;
    let dirR = (dir == "cw") ? 1 : -1;
    let newRotation = (4 + rotation + dirR) % 4;
    for (let i = 0; i <= 4; i++) {
      let kx = table[rotation][i].x;
      let ky = table[rotation][i].y;
      if (isOverlap(shapeName, px + kx, py + ky, newRotation))
        continue;
      return { x: kx, y: ky, kick: i };
    }
    return undefined;
  }
}

class GameVariables {
  curX: number = PIECE_INITIAL_X;
  curY: number = PIECE_INITIAL_Y;
  curPiece: string = "I";
  curRotation: number = 0;

  holdPiece: string | undefined = undefined;

  nextsBag: PieceBag = new PieceBag();
  genBag: PieceBag = new PieceBag();

  lastGravityfall: number | undefined = undefined;
  lockdownTimerBegin: number | undefined = undefined;
  lockdownAvoid: number = 0;
  reachedHeight: number = PIECE_INITIAL_Y_MAX;

  prevHarddropact: boolean = false;
  lastHarddrop: number | undefined = undefined;

  keydownSince: { [key: string]: number | undefined; } = {
    "left": undefined,
    "right": undefined
  }
  dasSince: number | undefined = undefined;
  lastMoved: number | "once" | "notyet" = "notyet";
  lastDir: string | undefined = undefined;

  prevClockwise: boolean = false;
  prevCountercw: boolean = false;

  holdActive: boolean = true;
  prevHoldact: boolean = false;
};

const v = new GameVariables();

let container;
let pixiapp: PIXI.Application<HTMLCanvasElement>;
let gameLoopInterval: number;

function sequential(first: number, length: number) {
  return new Array(length).fill(first).map((x, i) => x + i);
}

const FIELD_HEIGHT_SCALE = 0.8;
const NEXT_COUNT = 5;
const INFO_PIECE_HEIGHT_SCALE = 0.13;
const INFO_DISTANCE_PX = 10;
const INFO_PADDING_PX = 10;
const PIECE_INITIAL_X = 3;
const PIECE_INITIAL_Y = 17;
const PIECE_INITIAL_Y_MAX = 18;
const SHADOW_ALPHA = 0.25;
const HARDDROP_COOLDOWN = 100;
const LOCKDOWN_AVOID_LIMIT = 15;
const LOCKDOWN_DELAY = 500;

let appHeight: number;
let appWidth: number;
let fieldWidth: number;
let fieldHeight: number;

let field: PIXI.Graphics;
let grid: PIXI.Graphics;
let blocks: PIXI.Container;

let uis: PIXI.Graphics;
let infoBlocks: PIXI.Container;

let blocksData: number[][];

let tex: { [key: string]: PIXI.Texture } = {};
const blockTexId = ["bRed", "bOrange", "bYellow", "bGreen", "bBlue", "bCyan", "bPurple", "bGray"];

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

  initDraw();
  initGame();
});

onUnmounted(() => {
  setTimeout(destroy, 250);
});

function destroy() {
  container!.removeChild(pixiapp.view);
  pixiapp.destroy(true, { children: true });
  clearInterval(gameLoopInterval);
}

function initDraw() {
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

  drawField();
  drawGrid();
  drawUIField();
}

function refreshBlocks() {
  blocks.removeChildren();
  drawFieldBlocks();

  infoBlocks.removeChildren();
  drawNextList();
  drawHold();

  drawPiece(v.curPiece, v.curX, v.curY, v.curRotation);
  drawPiece(v.curPiece, v.curX, getGhostY(), v.curRotation, true);
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
  let nfHeight = fieldHeight * INFO_PIECE_HEIGHT_SCALE * NEXT_COUNT + INFO_PADDING_PX * 2;

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
  if (blockId == 0) return;

  let fWidth = fieldWidth;
  let fHeight = fieldHeight;
  let gWidth = fieldWidth / 10;

  let bottom = fHeight / 2;
  let left = -fWidth / 2;

  let x = left + gWidth * bx;
  let y = bottom - gWidth * (by + 1);

  let sprite = createBlockSprite(blockId, x, y, gWidth);
  if (sprite === undefined)
    throw Error;

  blocks.addChild(sprite);
}

function blockX(px: number, bx: number): number {
  return px + bx;
}

function blockY(py: number, by: number): number {
  return py + by;
}

/**
 * ピースの4x4範囲のうち、**左下**を指定します
 */
function drawPiece(shapeName: string, px: number, py: number, rotation: number, shadow: boolean = false) {
  let shape = shapes[shapeName].get(rotation);
  let shapeId = shapeIds[shapeName];
  if (shadow)
    shapeId += 10;

  for (let i = 0; i < 4; i++) {
    drawBlock(shapeId, blockX(px, shape[i].x), blockY(py, shape[i].y));
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

function createBlockSprite(blockId: number, bxPx: number, byPx: number, size: number): PIXI.Sprite | undefined {
  let result: PIXI.Sprite;

  if ((1 <= blockId && blockId <= 8) || (11 <= blockId && blockId <= 18)) {
    let texId = blockId - 1;
    if (blockId > 10) texId -= 10;

    result = new PIXI.Sprite(tex[blockTexId[texId]]);
    result.position.set(bxPx, byPx);
    result.width = size;
    result.height = size;
    if (blockId > 10) result.alpha = SHADOW_ALPHA;
    return result;
  }

  return undefined;
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

function pullNextPiece(): string {
  if (v.nextsBag.count == 0) {
    v.genBag.generate();
    v.nextsBag.enqueue(v.genBag);
  }

  let result = v.nextsBag.dequeue();
  if (result === undefined)
    throw Error;
  return result;
}

function getNextList(): string[] {
  if (v.nextsBag.count < NEXT_COUNT) {
    v.genBag.generate();
    v.nextsBag.enqueue(v.genBag);
  }

  return v.nextsBag.pieces.slice(0, NEXT_COUNT);
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

function drawHold() {
  if (v.holdPiece === undefined) return;

  let size = fieldHeight * INFO_PIECE_HEIGHT_SCALE / 3;
  let x = -(fieldWidth / 2 + INFO_DISTANCE_PX + INFO_PADDING_PX + size * 2);
  let y = -fieldHeight / 2;

  let shapeName = v.holdPiece;
  let sprite = createPieceSprite(shapeName, x, y, 0, size);
  infoBlocks.addChild(sprite);
}

function initPiece() {
  v.curX = PIECE_INITIAL_X;
  v.curY = PIECE_INITIAL_Y;
  v.curRotation = 0;
}

function isOverlap(shapeName: string, px: number, py: number, rotation: number): boolean {
  let shape = shapes[shapeName].get(rotation);

  for (let i = 0; i < 4; i++) {
    let bx = blockX(px, shape[i].x);
    let by = blockY(py, shape[i].y);
    if (bx < 0 || 9 < bx)
      return true;
    if (by < 0 || 39 < by)
      return true;
    if (blocksData[by][bx] > 0)
      return true;
  }
  return false;
}

function getGhostY(): number {
  let cy;
  for (cy = v.curY; !isOverlap(v.curPiece, v.curX, cy, v.curRotation); cy--);
  return cy + 1;
}



let debugRef = ref<{ [key: string]: number | string }>({});

let delayedAutoShift = 11;
let autoRepeatRate = 2;
let softDropFactor = 20;

function nowtime(): number {
  return Date.now();
}

function elapsed(time: number | undefined): number {
  if (time === undefined)
    return Number.MAX_VALUE;
  return nowtime() - time;
}

function initGame() {
  v.nextsBag = new PieceBag();
  v.genBag = new PieceBag();
  v.curPiece = pullNextPiece();
  initPiece();

  registerLoop();
}

function resumeGame() {
  v.genBag = new PieceBag();

  registerLoop();
}

function registerLoop() {
  gameLoopInterval = setInterval(gameLoop, 1);
  pixiapp.ticker.add(drawLoop);
}

let gameloopFps = new FpsCounter();

function gameLoop() {
  debugRef.value["gameloop"] = gameloopFps.get();
  manageGravity();
  manageHarddrop();
  manageMoveHorizontal();
  manageRotate();
  manageSwapHold();
  debugRef.value["holdact"] = `${actionState.value["hold"]}`;
}

function isLineFull(ly: number): boolean {
  for (let x = 0; x < 10; x++) {
    if (blocksData[ly][x] == 0)
      return false;
  }
  return true;
}

function clearFullLines(lys: number[]) {
  let filtered = lys
    .filter((e) => { return (0 <= e && e <= 39) })
    .filter((e) => isLineFull(e));
  for (let ly of filtered.reverse()) {
    for (let i = ly; i < 39; i++) {
      blocksData[i] = [...blocksData[i + 1]];
    }
    blocksData[39].fill(0);
  }
}

/**
 * ピースの4x4範囲のうち、**左下**を指定します
 */
function placePiece(shapeName: string, px: number, py: number, rotation: number) {
  let shape = shapes[shapeName].get(rotation);
  let shapeId = shapeIds[shapeName];

  for (let i = 0; i < 4; i++) {
    blocksData[blockY(py, shape[i].y)][blockX(px, shape[i].x)] = shapeId;
  }
  clearFullLines(sequential(py, 4));
}

function lockdown() {
  placePiece(v.curPiece, v.curX, v.curY, v.curRotation);
  v.curPiece = pullNextPiece();
  initPiece();
  v.lastGravityfall = nowtime();
  v.lockdownTimerBegin = undefined;
  v.lockdownAvoid = 0;
  v.reachedHeight = PIECE_INITIAL_Y_MAX;
  v.holdActive = true;
}

let gravity = 800;

function manageGravity() {
  let softdrop = actionState.value["softdrop"];
  let gravityInterval = gravity;
  gravityInterval /= (softdrop) ? softDropFactor : 1;

  if (isOverlap(v.curPiece, v.curX, v.curY - 1, v.curRotation)) {
    // 接地してる
    if (v.lockdownTimerBegin === undefined)
      v.lockdownTimerBegin = nowtime();
    if (elapsed(v.lockdownTimerBegin) >= LOCKDOWN_DELAY) {
      lockdown();
    }
  } else {
    // 接地してない
    v.lockdownTimerBegin = undefined;
    if (elapsed(v.lastGravityfall) >= gravityInterval) {
      v.curY -= 1;
      if (v.curY < v.reachedHeight) {
        v.reachedHeight = v.curY;
        v.lockdownAvoid = 0;
      }
      v.lastGravityfall = nowtime();
    }
  }
}

function addLockdownAvoid() {
  if (v.lockdownTimerBegin === undefined)
    return;
  if (v.lockdownAvoid >= LOCKDOWN_AVOID_LIMIT)
    return;

  v.lockdownAvoid++;
  v.lockdownTimerBegin = nowtime();
}

function manageHarddrop() {
  let harddropact = actionState.value["harddrop"];

  if (!v.prevHarddropact && harddropact && elapsed(v.lastHarddrop) >= HARDDROP_COOLDOWN) {
    v.lastHarddrop = nowtime();
    harddrop();
  }

  v.prevHarddropact = harddropact;
}

function harddrop() {
  v.curY = getGhostY();
  lockdown();
}

function manageMoveHorizontal() {
  let moveDir: string | undefined = undefined;
  let result = false;

  for (let dir of ["left", "right"]) {
    if (actionState.value[dir] && v.keydownSince[dir] === undefined)
      v.keydownSince[dir] = nowtime();
    if (!actionState.value[dir] && v.keydownSince[dir] !== undefined)
      v.keydownSince[dir] = undefined;
  }

  for (let dir of ["left", "right"]) {
    let counterDir = (dir == "left") ? "right" : "left";

    if (v.keydownSince[dir] !== undefined &&
      (v.keydownSince[counterDir] === undefined || v.keydownSince[dir]! > v.keydownSince[counterDir]!)) {
      moveDir = dir;
    }
  }

  if (moveDir === undefined) {
    v.lastMoved = "notyet";
    v.lastDir = undefined;
    return;
  }

  if (v.lastDir != moveDir) {
    v.lastMoved = "notyet";
    v.dasSince = nowtime();
  }
  v.lastDir = moveDir;
  debugRef.value["moveDir"] = moveDir;

  let dasMs = Math.floor(delayedAutoShift * (1000 / 60));
  let arrMs = Math.floor(autoRepeatRate * (1000 / 60));

  if (v.lastMoved == "notyet") {
    result = moveHorizontal(moveDir);
    v.lastMoved = "once";
  }
  else if (v.lastMoved == "once") {
    if (elapsed(v.dasSince) >= dasMs) {
      result = moveHorizontal(moveDir);
      v.lastMoved = nowtime();
    }
  }
  else if (elapsed(v.lastMoved) >= arrMs) {
    result = moveHorizontal(moveDir);
    v.lastMoved = nowtime();
  }

  if (result)
    addLockdownAvoid();
}

function moveHorizontal(dir: string): boolean {
  let dirX = (dir == "left") ? -1 : 1
  let result = !isOverlap(v.curPiece, v.curX + dirX, v.curY, v.curRotation);
  if (result)
    v.curX += dirX;
  return result;
}

const srsTable: { [key: string]: KickTable } = {}

srsTable.I = new KickTable(
  [
    [new XY(0, 0), new XY(-2, 0), new XY(1, 0), new XY(-2, -1), new XY(1, 2)],
    [new XY(0, 0), new XY(-1, 0), new XY(2, 0), new XY(-1, 2), new XY(2, -1)],
    [new XY(0, 0), new XY(2, 0), new XY(-1, 0), new XY(2, 1), new XY(-1, -2)],
    [new XY(0, 0), new XY(1, 0), new XY(-2, 0), new XY(1, -2), new XY(-2, 1)],
  ],
  [
    [new XY(0, 0), new XY(-1, 0), new XY(2, 0), new XY(-1, 2), new XY(2, -1)],
    [new XY(0, 0), new XY(2, 0), new XY(-1, 0), new XY(2, 1), new XY(-1, -2)],
    [new XY(0, 0), new XY(1, 0), new XY(-2, 0), new XY(1, -2), new XY(-2, 1)],
    [new XY(0, 0), new XY(-2, 0), new XY(1, 0), new XY(-2, -1), new XY(1, 2)],
  ],
);
srsTable.T = new KickTable(
  [
    [new XY(0, 0), new XY(-1, 0), new XY(-1, 1), new XY(0, -2), new XY(-1, -2)],
    [new XY(0, 0), new XY(1, 0), new XY(1, -1), new XY(0, 2), new XY(1, 2)],
    [new XY(0, 0), new XY(1, 0), new XY(1, 1), new XY(0, -2), new XY(1, -2)],
    [new XY(0, 0), new XY(-1, 0), new XY(-1, -1), new XY(0, 2), new XY(-1, 2)],
  ],
  [
    [new XY(0, 0), new XY(1, 0), new XY(1, 1), new XY(0, -2), new XY(1, -2)],
    [new XY(0, 0), new XY(1, 0), new XY(1, -1), new XY(0, 2), new XY(1, 2)],
    [new XY(0, 0), new XY(-1, 0), new XY(-1, 1), new XY(0, -2), new XY(-1, -2)],
    [new XY(0, 0), new XY(-1, 0), new XY(-1, -1), new XY(0, 2), new XY(-1, 2)],
  ],
);
srsTable.L = srsTable.T;
srsTable.J = srsTable.T;
srsTable.S = srsTable.T;
srsTable.Z = srsTable.T;

function manageRotate() {
  let clockwise = actionState.value["rotatecw"];
  let countercw = actionState.value["rotateccw"];
  let result = false;

  if (!v.prevClockwise && clockwise) {
    result = rotate("cw");
  }
  else if (!v.prevCountercw && countercw) {
    result = rotate("ccw");
  }
  if (result)
    addLockdownAvoid();

  v.prevClockwise = clockwise;
  v.prevCountercw = countercw;
}

function rotate(dir: "cw" | "ccw"): boolean {
  if (v.curPiece == "O")
    return false;

  let dirR = (dir == "cw") ? 1 : -1;
  let newRotation = (4 + v.curRotation + dirR) % 4;
  let result = srsTable[v.curPiece].use(v.curPiece, v.curX, v.curY, v.curRotation, dir);
  if (result === undefined)
    return false;

  v.curRotation = newRotation;
  v.curX += result.x;
  v.curY += result.y;
  return true;
}

function manageSwapHold() {
  if (!v.holdActive)
    return;

  let holdact = actionState.value["hold"];

  if (!v.prevHoldact && holdact) {
    swapHold();
    v.holdActive = false;
  }

  v.prevHoldact = holdact;
}

function swapHold() {
  let tmp = v.holdPiece;
  v.holdPiece = v.curPiece;
  if (tmp === undefined)
    v.curPiece = pullNextPiece();
  else
    v.curPiece = tmp;

  initPiece();
}

let fps = new FpsCounter();

function drawLoop() {
  debugRef.value["fps"] = fps.get();
  refreshBlocks();
}

</script>

<template>
  <div id="tetgame"></div>
  <div id="debugref">
    [Debug Information]<br>{{ debugRef }}<br>
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