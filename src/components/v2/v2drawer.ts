import * as PIXI from "pixi.js";
import { XY } from "./v2structs";
import type { ShapeDict } from "./v2logic";
import { Shape } from "./v2logic";
import { AssetsLoader } from "./v2assetsloader";

class ContainerWrapper {
  container: PIXI.Container;
  size: XY;
  parentSize: XY;

  constructor(container: PIXI.Container, size: XY, parentSize: XY) {
    this.container = container;
    this.size = size;
    this.parentSize = parentSize;
  }

  get obj(): PIXI.Container {
    return this.container;
  }

  get asGraphics(): PIXI.Graphics {
    if (this.container instanceof PIXI.Graphics)
      return this.container as PIXI.Graphics;
    throw new Error("Not graphics object");
  }

  get asSprite(): PIXI.Sprite {
    if (this.container instanceof PIXI.Sprite)
      return this.container as PIXI.Sprite;
    throw new Error("Not sprite object");
  }

  setPositionFromCenter(position: XY, pivot: "Center" | "Left" | "Right" | "Top" | "Bottom" | "Left-Top" | "Right-Top" | "Left-Bottom" | "Right-Bottom" = "Center"): ContainerWrapper {
    let s = this.size;
    if (pivot === "Center") this.container.pivot.set(s.half.x, s.half.y);
    if (pivot === "Left") this.container.pivot.set(0, s.half.y);
    if (pivot === "Right") this.container.pivot.set(s.x, s.half.y);
    if (pivot === "Top") this.container.pivot.set(s.half.x, 0);
    if (pivot === "Bottom") this.container.pivot.set(s.half.x, s.y);
    if (pivot === "Left-Top") this.container.pivot.set(0, 0);
    if (pivot === "Right-Top") this.container.pivot.set(s.x, 0);
    if (pivot === "Left-Bottom") this.container.pivot.set(0, s.y);
    if (pivot === "Right-Bottom") this.container.pivot.set(s.x, s.y);

    this.container.position.set(this.parentSize.half.x + position.x, this.parentSize.half.y + position.y);
    return this;
  }
}

class DrawerConsts {
  static readonly bgGradient = [0x445460, 0x3a3040];
  static readonly bgPaleGradient = [0x2f536e, 0x8a7489];
  static readonly borderGradient = [0xc7f5d5, 0x87c1f5];

  static readonly margin = new XY(20, 0);

  static readonly texturesPaths = new Map<string, string>([
    ["block.Z", "img/game/red.png"],
    ["block.L", "img/game/orange.png"],
    ["block.O", "img/game/yellow.png"],
    ["block.S", "img/game/green.png"],
    ["block.I", "img/game/blue.png"],
    ["block.J", "img/game/cyan.png"],
    ["block.T", "img/game/purple.png"],
    ["block.#", "img/game/gray.png"],
  ]);
}

class Drawer {
  pixiapp: PIXI.Application;
  container: HTMLElement;
  containerSize: XY;
  elements: Map<string, ContainerWrapper> = new Map();
  loader: AssetsLoader = new AssetsLoader();
  textures: Map<string, PIXI.Texture> = new Map();
  cachedFieldData: string[][] = [];
  fieldBlockElements: Map<string, ContainerWrapper> = new Map();
  cachedNextQueue: string[] = [];
  cachedHoldQueue: string[] = [];
  nextQueueElements: ContainerWrapper[] = [];
  holdQueueElements: ContainerWrapper[] = [];
  shapeSet: ShapeDict;

  fieldSize: XY = new XY(0, 0);
  blockSize: XY = new XY(0, 0);
  nextBoxSize: XY = new XY(0, 0);
  holdBoxSize: XY = new XY(0, 0);

  gridCount: XY = new XY(10, 20);
  nextCount: number = 5;
  holdCount: number = 1;

  readonly emptyBlock: string;

  constructor(container: HTMLElement, emptyBlock: string, shapeSet: ShapeDict) {
    this.pixiapp = new PIXI.Application();
    this.container = container!;
    this.containerSize = new XY(container.offsetWidth, container.offsetHeight);
    this.emptyBlock = emptyBlock;
    this.shapeSet = shapeSet;
  }

  async init() {
    await this.pixiapp.init({
      resizeTo: this.container,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    this.container.appendChild(this.pixiapp.canvas);
    this.redrawFields();
  }

  async loadAssets() {
    this.loader.addTexturePaths(DrawerConsts.texturesPaths);
    await this.loader.loadTextures({
      progress: (percentage, next) => {
        console.log(`${percentage.toFixed(1)}% done, next: ${next}`);
      },
      callback: () => {},
    });
    for (let name of DrawerConsts.texturesPaths.keys()) {
      this.textures.set(name, this.loader.getTexture(name));
    }
  }

  test() {
  }

  redrawFields() {
    this.updateFieldSize();

    // フィールド
    let oldField = this.elements.get("field");
    if (oldField !== undefined) {
      oldField.obj.destroy();
      this.elements.delete("field");
    }

    let field = new ContainerWrapper(new PIXI.Graphics(), this.fieldSize, this.containerSize);
    this.elements.set("field", field);
    this.pixiapp.stage.addChild(field.asGraphics);
    field.setPositionFromCenter(new XY(0, 0));

    this.drawBackgroundFor(field.asGraphics, this.fieldSize);
    this.drawGridFor(field.asGraphics, this.fieldSize, this.gridCount);
    this.drawBoundsFor(field.asGraphics, this.fieldSize);

    // ネクスト
    let oldNextBox = this.elements.get("nextBox");
    if (oldNextBox !== undefined) {
      oldNextBox.obj.destroy();
      this.elements.delete("nextBox");
    }

    let nextBox = new ContainerWrapper(new PIXI.Graphics(), this.nextBoxSize, this.fieldSize);
    this.elements.set("nextBox", nextBox);
    field.asGraphics.addChild(nextBox.asGraphics);
    nextBox.setPositionFromCenter(this.fieldSize.onlyX.half.add(DrawerConsts.margin.onlyX).add(this.fieldSize.half.minus.onlyY), "Left-Top");

    this.drawBackgroundFor(nextBox.asGraphics, this.nextBoxSize, DrawerConsts.bgPaleGradient);
    this.drawBoundsFor(nextBox.asGraphics, this.nextBoxSize);

    // ホールド
    let oldHoldBox = this.elements.get("holdBox");
    if (oldHoldBox !== undefined) {
      oldHoldBox.obj.destroy();
      this.elements.delete("holdBox");
    }

    let holdBox = new ContainerWrapper(new PIXI.Graphics(), this.nextBoxSize, this.fieldSize);
    this.elements.set("holdBox", holdBox);
    field.asGraphics.addChild(holdBox.asGraphics);
    holdBox.setPositionFromCenter(this.fieldSize.onlyX.minus.half.add(DrawerConsts.margin.minus.onlyX).add(this.fieldSize.half.minus.onlyY), "Right-Top");

    this.drawBackgroundFor(holdBox.asGraphics, this.holdBoxSize, DrawerConsts.bgPaleGradient);
    this.drawBoundsFor(holdBox.asGraphics, this.holdBoxSize);
  }

  setGridCount(gridCount: XY) {
    this.gridCount = gridCount;
  }

  setNextAndHoldCount(nextCount: number, holdCount: number) {
    this.nextCount = nextCount;
    this.holdCount = holdCount;
    this.cachedNextQueue = Array(nextCount);
    this.cachedHoldQueue = Array(holdCount);
    this.redrawFields();
  }

  updateNextQueue(queue: string[]) {
    return this.updateQueue(queue, "next", this.nextCount);
  }

  updateHoldQueue(queue: string[]) {
    return this.updateQueue(queue, "hold", this.holdCount);
  }

  private updateQueue(queue: string[], queueName: "next" | "hold", itemCount: number) {
    const queueNameCamel = queueName === "next" ? "Next" : "Hold";

    if (queue.length !== itemCount)
      return;
    if (!(this[`cached${queueNameCamel}Queue`] instanceof Array)) // 型ガード
      return;
    
    let cachedQueueCopy = [...this[`cached${queueNameCamel}Queue`]];
    let cnt;
    for (cnt = 0; cnt < queue.length; cnt++) {
      if (isMatched(cachedQueueCopy, queue))
        break;
      cachedQueueCopy.shift();
    }
    this.refleshQueueElement(queue, queueName, cnt, itemCount);
    this[`cached${queueNameCamel}Queue`] = queue;

    function isMatched(a: string[], b: string[]): boolean {
      let n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i++) {
        if (a[i] !== b[i])
          return false;
      }
      return true;
    }
  }

  private refleshQueueElement(queue: string[], queueName: "next" | "hold", slideCount: number, itemCount: number) {
    if (!(this[`${queueName}QueueElements`] instanceof Array)) // 型ガード
      return;
    let parent = this.elements.get(`${queueName}Box`);
    if (parent === undefined) 
      return;

    // キューから追い出される要素
    for (let i = 0; i < slideCount; i++) {
      if (this[`${queueName}QueueElements`].length === 0)
        break;
      this[`${queueName}QueueElements`][0].obj.destroy();
      this[`${queueName}QueueElements`].shift();
    }
    // キュー内を移動する要素
    for (let i = 0; i < itemCount - slideCount; i++) {
      if (i >= this[`${queueName}QueueElements`].length)
        break;
      this.repositionQueueItem(this[`${queueName}QueueElements`][i], i, itemCount, queueName);
    }
    // キューに新たに入る要素
    for (let i = itemCount - slideCount; i < itemCount; i++) {
      let block = this.createPieceElement(queue[i], this.shapeSet[queue[i]], queueName);
      parent.obj.addChild(block.obj);
      this[`${queueName}QueueElements`].push(block);
      this.repositionQueueItem(block, i, itemCount, queueName);
    }
  }

  private repositionQueueItem(sprite: ContainerWrapper, index: number, itemCount: number, queueName: "next" | "hold") {
    const boxHeight = this[`${queueName}BoxSize`].y - 50;
    sprite.setPositionFromCenter(new XY(0, -boxHeight / 2 + boxHeight / itemCount * (index + 0.5)), "Center");
  }

  private createPieceElement(blockId: string, shape: Shape, queueName: "next" | "hold"): ContainerWrapper {
    const shapeWidth = this.nextBoxSize.x * 0.8;
    const shapeSize = new XY(shapeWidth, shapeWidth / shape.width * shape.heightOnInitialDirection);
    const blockScaledownThreshold = 4;
    const blockWidth = shapeWidth / Math.max(blockScaledownThreshold, shape.width);
    const blockSize = new XY(blockWidth, blockWidth);

    let container = new PIXI.Container();
    for (let xy of shape.get(0)) {
      let block = new ContainerWrapper(new PIXI.Sprite(this.textures.get(`block.${blockId}`)), blockSize, shapeSize);
      container.addChild(block.obj);
      block.obj.width = blockWidth;
      block.obj.height = blockWidth;
      block.setPositionFromCenter(blockSize.mul(xy.add(new XY(shape.width, 2 + shape.heightOnInitialDirection).half.minus)), "Left-Top");
    }
    return new ContainerWrapper(container, shapeSize, this[`${queueName}BoxSize`]);
  }

  updateFieldBlocks(fieldData: string[][]) {
    if (this.checkAndFixFieldDataLength(fieldData)) {
      for (let xy of this.getDifferencesOfFieldData(fieldData)) {
        this.updateFieldBlock(xy, fieldData[xy.x][xy.y]);
      }
    }
    else {
      for (let xy of this.getAllCoordsOfExistingBlock(fieldData)) {
        this.updateFieldBlock(xy, fieldData[xy.x][xy.y])
      }
    }
    this.cachedFieldData = fieldData;
  }

  private updateFieldBlock(coord: XY, blockId: string) {
    if (blockId === this.emptyBlock) {
      this.fieldBlockElements.get(coord.toString())?.obj.destroy();
      this.fieldBlockElements.delete(coord.toString());
    }
    else {
      if (this.fieldBlockElements.has(coord.toString()))
        this.fieldBlockElements.delete(coord.toString());
      let block = new ContainerWrapper(this.createBlockSprite(blockId), this.blockSize, this.fieldSize);
      block.setPositionFromCenter(this.blockSize.mul(coord.add(this.gridCount.minus.half).minusY.add(0, -1)), "Left-Top");
      this.fieldBlockElements.set(coord.toString(), block);
    }
  }

  private createBlockSprite(blockId: string): PIXI.Sprite {
    let field = this.elements.get("field");
    if (field === undefined)
      throw new Error("No field element");

    let block = new PIXI.Sprite(this.textures.get(`block.${blockId}`));
    field.obj.addChild(block);
    block.width = this.blockSize.x;
    block.height = this.blockSize.y;
    return block;
  }

  private checkAndFixFieldDataLength(fieldData: string[][]): boolean {
    let result = true;

    if (this.cachedFieldData.length !== fieldData.length) result = false;
    for (let i = 0; i < this.cachedFieldData.length; i++) {
      if (this.cachedFieldData[i].length !== fieldData[i].length) result = false;
    }
    if (!result)
      this.cachedFieldData = Array(fieldData.length).fill(Array(fieldData[0].length).fill(this.emptyBlock));
    return result;
  }

  private getDifferencesOfFieldData(fieldData: string[][]): XY[] {
    let result: XY[] = [];
    for (let x = 0; x < fieldData.length; x++) {
      for (let y = 0; y < fieldData[x].length; y++) {
        if (fieldData[x][y] !== this.cachedFieldData[x][y])
          result.push(new XY(x, y));
      }
    }
    return result;
  }

  private getAllCoordsOfExistingBlock(fieldData: string[][]): XY[] {
    let result: XY[] = [];
    for (let x = 0; x < fieldData.length; x++) {
      for (let y = 0; y < fieldData[x].length; y++) {
        if (fieldData[x][y] !== this.emptyBlock)
          result.push(new XY(x, y));
      }
    }
    return result;
  }

  private updateFieldSize() {
    let height = this.containerSize.y * 0.8;
    let blockHeight = height / this.gridCount.y;
    this.blockSize = new XY(blockHeight, blockHeight);
    this.fieldSize = new XY(blockHeight * this.gridCount.x, blockHeight * this.gridCount.y);

    let itemHeight = height * 0.2;
    this.nextBoxSize = new XY(itemHeight, Math.min(calcHeightWithItemCount(this.nextCount), this.fieldSize.y));
    this.holdBoxSize = new XY(itemHeight, Math.min(calcHeightWithItemCount(this.holdCount), this.fieldSize.y));

    function calcHeightWithItemCount(itemCount: number) {
      let unit = itemHeight;
      return unit + 0.8 * unit * (itemCount - 1);
    }
  }

  private drawBackgroundFor(graphics: PIXI.Graphics, size: XY, colors: number[] = DrawerConsts.bgGradient): PIXI.Graphics {
    graphics.beginPath().rect(0, 0, size.x, size.y)
    .fill({
      fill: new PIXI.FillGradient(size.half.x - size.y / 5, 0, size.half.x + size.y / 5, size.y).addColorStop(0, colors[0]).addColorStop(1, colors[1]),
    });

    return graphics;
  }

  private drawBoundsFor(graphics: PIXI.Graphics, size: XY): PIXI.Graphics {
    graphics.moveTo(size.half.x, 0).lineTo(size.x, 0).lineTo(size.x, size.y).lineTo(0, size.y).lineTo(0, 0).lineTo(size.half.x, 0)
    .stroke({
      width: 5,
      color: 0x666666,
    }).moveTo(size.half.x, 0).lineTo(size.x, 0).lineTo(size.x, size.y).lineTo(0, size.y).lineTo(0, 0).lineTo(size.half.x, 0)
    .stroke({
      width: 3,
      fill: new PIXI.FillGradient(size.half.x - size.y / 5, 0, size.half.x + size.y / 5, size.y).addColorStop(0, DrawerConsts.borderGradient[0]).addColorStop(1, DrawerConsts.borderGradient[1]),
    });

    return graphics;
  }

  private drawGridFor(graphics: PIXI.Graphics, size: XY, gridCount: XY): PIXI.Graphics {
    let style: PIXI.StrokeStyle;
    style = {
      width: 1,
      color: 0xeeffff,
      alpha: 0.2,
    };

    // グリッド線
    for (let i = 1; i < gridCount.x; i++) {
      let x = size.x / gridCount.x * i;
      graphics.moveTo(x, 0).lineTo(x, size.y).stroke(style);
    }
    for (let i = 1; i < gridCount.y; i++) {
      let y = size.y / gridCount.y * i;
      graphics.moveTo(0, y).lineTo(size.x, y).stroke(style);
    }

    return graphics;
  }
}

export {Drawer};