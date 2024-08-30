import { Field, KickTableSet, PieceBag, FieldPiece, Shape, XY } from "./v2logic";
import type { ShapeDict, RotationType } from "./v2logic";
import { GameSettings } from "./v2settings";
import { Blocks, KickTableSets, ShapeSets } from "./v2consts";
import { InputReceiver } from "./v2inputreceiver";
import { PlayerSettings } from "./v2playersettings";
import { Drawer } from "./v2drawer";

const msPerFrame = 1000 / 60;

type FieldPieceSettings = {
  spawnsLowerEdgeMin: number;
  spawnsLowerEdgeMax: number;
  holdCount: number;
  holdSwappableCount: "infinite" | "oneCycle" | number;
  onNextOut: Function;
  onBlockOut: Function;
  onHoldBlocked: Function;
  setDcd: Function;
  doHoldGrayout: Function;
  onHoldLimitReset: Function;
}

class FieldPieceController {
  field: Field;
  kickTables: KickTableSet;
  pieceBag: PieceBag;
  shapeDict: ShapeDict;

  piece: FieldPiece;
  holdQueue: string[] = [];
  holdSwapped: number = 0;
  holdSwapLimit: number;
  settings: FieldPieceSettings;

  constructor(field: Field, kickTables: KickTableSet, pieceBag: PieceBag, shapeDict: ShapeDict, settings: FieldPieceSettings) {
    this.field = field;
    this.kickTables = kickTables;
    this.pieceBag = pieceBag;
    this.shapeDict = shapeDict;
    this.settings = settings;

    this.holdSwapLimit =
      settings.holdSwappableCount === "infinite" ? -1 :
      settings.holdSwappableCount === "oneCycle" ? settings.holdCount :
      settings.holdSwappableCount as number;

    let next = this.pieceBag.pickNext();
    if (next === undefined)
      throw new Error("No Next As Of Initialization");
    
    let newPiece = this.getNewPiece(next);
    if (newPiece === undefined)
      throw new Error("Already Blocked Out As Of Initialization");
    this.piece = newPiece;
  }

  getPiece(): FieldPiece {
    return this.piece;
  }

  getHoldQueue(): string[] {
    return this.holdQueue;
  }

  moveLeft(count: number) {
    let dx;
    for (dx = 0; dx < count; dx++) {
      if (this.field.isOverlap(this.piece.movedTo(new XY(-dx - 1, 0))))
        break;
    }
    this.piece = this.piece.movedTo(new XY(-dx, 0));
  }

  moveRight(count: number) {
    let dx;
    for (dx = 0; dx < count; dx++) {
      if (this.field.isOverlap(this.piece.movedTo(new XY(dx + 1, 0))))
        break;
    }
    this.piece = this.piece.movedTo(new XY(dx, 0));
  }

  moveBottom(count: number) {
    let dy;
    for (dy = 0; dy < count; dy++) {
      if (this.field.isOverlap(this.piece.movedTo(new XY(0, -dy - 1))))
        break;
    }
    this.piece = this.piece.movedTo(new XY(0, -dy));
  }

  hardDrop() {
    this.piece = this.field.getGroundedPiece(this.piece);
    this.lockdown();
  }

  rotate(rotation: RotationType) {
    let kickResult = this.kickTables.getResult(this.piece, rotation, this.field);
    if (kickResult !== undefined) {
      this.piece = this.piece.rotated(rotation).goneTo(kickResult.xy);
    }
  }

  swapHold() {
    if (this.holdSwapLimit !== -1 && this.holdSwapped == this.holdSwapLimit) {
      this.settings.onHoldBlocked();
      return;
    }

    if (this.holdQueue[0] === "") {
      this.holdQueue.push(this.piece.shape.name);
      this.holdQueue.shift();
      this.pullNext();
    }
    else {
      let shapeName = this.holdQueue.shift();
      if (shapeName === undefined)
        throw new Error("for type guarding");

      let tmp = this.getNewPiece(shapeName);
      if (tmp === undefined)
        throw new Error("for type guarding");

      this.holdQueue.push(this.piece.shape.name);
      this.piece = tmp;
    }
    this.holdSwapped++;
    let swapLeft = this.holdSwapLimit - this.holdSwapped;
    this.settings.doHoldGrayout(Math.max(0, this.settings.holdCount - swapLeft));
  }

  private pullNext() {
    let next = this.pieceBag.pickNext();
    if (next === undefined) {
      this.settings.onNextOut();
      return;
    }

    let newPiece = this.getNewPiece(next);
    if (newPiece === undefined) {
      this.settings.onBlockOut();
      return;
    }
    this.piece = newPiece;
  }

  private lockdown() {
    this.field.setPieceBlocks(this.piece);
    this.holdSwapped = 0;
    this.pullNext();
    this.settings.onHoldLimitReset();
    this.settings.setDcd();
  }

  private getNewPiece(pieceName: string): FieldPiece | undefined {
    let newPiece = new FieldPiece(this.shapeDict[pieceName], this.settings.spawnsLowerEdgeMin);
    while (this.field.isOverlap(newPiece)) {
      newPiece = newPiece.movedTo(new XY(0, 1));
      if (newPiece.xy.y >= this.settings.spawnsLowerEdgeMax)
        return undefined;
    }
    return newPiece;
  }
}

class InputEmitter {
  private functions: {inquireTo: () => boolean, execution: () => void, isContinuable: () => boolean}[] = [];
  private delayMs: number;
  private dasMs: number;
  private arrMs: number;
  private dcdMs: number;

  private lockUntil: number | undefined;
  private prevIndex: number | undefined;
  private inputSince: (number | undefined)[] = [];
  private lastAt: number | undefined;
  private firstAt: number | undefined;
  private secondAt: number | undefined;

  constructor({functions, delayFrame, dasFrame, arrFrame, dcdFrame}: {functions: {inquireTo: () => boolean, execution: () => void, isContinuable: () => boolean}[], delayFrame?: number, dasFrame?: number, arrFrame?: number, dcdFrame?: number}) {
    this.functions = functions;
    this.inputSince = Array(this.functions.length).fill(undefined);
    this.delayMs = (delayFrame ?? 0) * msPerFrame;
    this.dasMs = (dasFrame ?? 0) * msPerFrame;
    this.arrMs = (arrFrame ?? -1) * msPerFrame;
    this.dcdMs = (dcdFrame ?? -1) * msPerFrame;
  }

  emit() {
    if (this.lockUntil !== undefined && Date.now() < this.lockUntil)
      return;

    let index = this.getLatestInputIndex();
    let prevIndex = this.prevIndex;
    this.prevIndex = index;
    if (index === undefined)
      return;

    if (index !== prevIndex) {
      this.lastAt = 0;
      this.firstAt = Date.now() + this.delayMs;
      this.secondAt = this.firstAt + this.dasMs;
    }

    const now = Date.now();
    let next = this.getNextExecutionTime();
    while (next !== undefined && next <= now) {
      this.lastAt = next;
      this.functions[index].execution();
      if (!this.functions[index].isContinuable()) {
        this.lastAt = Date.now();
        break;
      }
      next = this.getNextExecutionTime();
    }
  }

  getLatestInputIndex(): number | undefined {
    const now = Date.now();
    for (let i = 0; i < this.inputSince.length; i++) {
      if (this.inputSince[i] === undefined && this.functions[i].inquireTo())
        this.inputSince[i] = now;
      else if (!this.functions[i].inquireTo())
        this.inputSince[i] = undefined;
    }

    let result = undefined;
    let max = -1;
    for (let i = 0; i < this.inputSince.length; i++) {
      let inputSince = this.inputSince[i];
      if (inputSince !== undefined && max < inputSince) {
        max = inputSince;
        result = i;
      }
    }
    return result;
  }

  resetWithDcd() {
    if (this.getLatestInputIndex() === undefined)
      return;
    this.lastAt = Date.now();
    this.firstAt = this.secondAt = this.lastAt + this.dcdMs;
  }

  setLockTimer(ms: number) {
    this.lockUntil = Date.now() + ms;
  }

  private getNextExecutionTime(): number | undefined {
    if (this.firstAt === undefined) throw new Error("for type guarding");
    if (this.secondAt === undefined) throw new Error("for type guarding");
    if (this.lastAt === undefined) throw new Error("for type guarding");

    if (this.lastAt < this.firstAt)
      return this.firstAt;
    if (this.arrMs < 0)
      return undefined;
    if (this.firstAt !== this.secondAt && this.lastAt < this.secondAt)
      return this.secondAt;
    return this.lastAt + this.arrMs;
  }
}

class GameCycle {
  field: Field;
  kickTables: KickTableSet;
  pieceBag: PieceBag;
  shapeDict: ShapeDict;
  fieldPieceController: FieldPieceController;
  inputReceiver: InputReceiver;
  emits: Map<string, InputEmitter> = new Map();
  drawer: Drawer;
  gameSettings: GameSettings;
  
  holdColorChangeState: number | "restore" | "none" = "none";

  constructor(field: Field, kickTables: KickTableSet, pieceBag: PieceBag, shapeDict: ShapeDict, fieldPieceController: FieldPieceController, inputReceiver: InputReceiver, drawer: Drawer, playerSettings: PlayerSettings, gameSettings: GameSettings) {
    this.field = field;
    this.kickTables = kickTables;
    this.pieceBag = pieceBag;
    this.shapeDict = shapeDict;
    this.fieldPieceController = fieldPieceController;
    this.inputReceiver = inputReceiver;
    this.drawer = drawer;
    this.gameSettings = gameSettings;

    this.emits.set("move", new InputEmitter({
      functions: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("moveLeft")},
          execution: () => {this.fieldPieceController.moveLeft(1)},
          isContinuable: () => {return !this.field.isOverlap(this.fieldPieceController.piece.movedTo(new XY(-1, 0)))},
        }, 
        {
          inquireTo: () => {return this.inputReceiver.isActive("moveRight")},
          execution: () => {this.fieldPieceController.moveRight(1)},
          isContinuable: () => {return !this.field.isOverlap(this.fieldPieceController.piece.movedTo(new XY(1, 0)))},
        },
      ], 
      arrFrame: playerSettings.handlings.autoRepeatRate_Frame,
      dasFrame: playerSettings.handlings.delayedAutoShift_Frame,
      dcdFrame: playerSettings.handlings.dasCancelDelay_Frame,
    }));
    this.emits.set("softDrop", new InputEmitter({
      functions: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("softDrop")},
          execution: () => {this.fieldPieceController.moveBottom(1)},
          isContinuable: () => {return !this.field.isOverlap(this.fieldPieceController.piece.movedTo(new XY(0, -1)))},
        }, 
      ], 
      delayFrame: playerSettings.handlings.delayedSoftDrop_Frame,
      arrFrame: playerSettings.handlings.autoRepeatRate_Frame,
    }));
    this.emits.set("hardDrop", new InputEmitter({
      functions: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("hardDrop")},
          execution: () => {this.fieldPieceController.hardDrop()},
          isContinuable: () => {return false},
        }, 
      ], 
    }));
    this.emits.set("rotateCW", new InputEmitter({
      functions: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("rotateCW")},
          execution: () => {this.fieldPieceController.rotate("cw")},
          isContinuable: () => {return false},
        }, 
      ], 
    }));
    this.emits.set("rotateCCW", new InputEmitter({
      functions: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("rotateCCW")},
          execution: () => {this.fieldPieceController.rotate("ccw")},
          isContinuable: () => {return false},
        }, 
      ], 
    }));
    this.emits.set("rotate180", new InputEmitter({
      functions: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("rotate180")},
          execution: () => {this.fieldPieceController.rotate("180")},
          isContinuable: () => {return false},
        }, 
      ], 
    }));
    this.emits.set("swapHold", new InputEmitter({
      functions: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("hold")},
          execution: () => {this.fieldPieceController.swapHold()},
          isContinuable: () => {return false},
        }, 
      ], 
    }));
  }

  processLoop() {
    for (let emit of this.emits.values())
      emit.emit();
  }

  drawLoop() {
    let fieldCopy = JSON.parse(JSON.stringify(this.field.fieldData));
    let piece = this.fieldPieceController.getPiece();
    let groundedPiece = this.field.getGroundedPiece(piece);
    for (let xy of groundedPiece.getAllBlocksXy()) {
      fieldCopy[xy.x][xy.y] = groundedPiece.shape.name + "t";
    }
    for (let xy of piece.getAllBlocksXy()) {
      fieldCopy[xy.x][xy.y] = piece.shape.name;
    }
    this.drawer.updateFieldBlocks(fieldCopy);
    this.drawer.updateNextQueue(this.pieceBag.getNexts(this.gameSettings.nextCount));
    this.drawer.updateHoldQueue(this.fieldPieceController.getHoldQueue());

    if (typeof this.holdColorChangeState === "number")
      this.drawer.grayoutHolds(this.holdColorChangeState); 
    if (this.holdColorChangeState === "restore")
      this.drawer.restoreHoldsColor(); 
    this.holdColorChangeState = "none";
  }

  static createInstance(gameSettings: GameSettings, playerSettings: PlayerSettings, drawer: Drawer): GameCycle {
    const fieldExtraHeight = 20;

    let field = new Field({
      width: gameSettings.fieldWidth,
      height: gameSettings.fieldHeight,
      topOutHeight: gameSettings.fieldHeight + fieldExtraHeight,
      blockSet: Blocks[gameSettings.blockSet],
      emptyBlock: Blocks.empty,
    });
    let kickTables = KickTableSets[gameSettings.kickTable];
    let pieceBag = new PieceBag(gameSettings.bagPattern, Blocks[gameSettings.blockSet]);
    let shapeDict = ShapeSets[gameSettings.shapeSet];
    let controller = new FieldPieceController(field, kickTables, pieceBag, shapeDict, {
      spawnsLowerEdgeMin: clampSpawnsLowerEdge(gameSettings.spawnRelativeY + gameSettings.fieldHeight),
      spawnsLowerEdgeMax: clampSpawnsLowerEdge(gameSettings.spawnRelativeYMax + gameSettings.fieldHeight),
      holdCount: gameSettings.holdCount,
      holdSwappableCount: gameSettings.holdSwappableCount,
      onNextOut: () => console.log("Next Out"),
      onBlockOut: () => console.log("Block Out"),
      onHoldBlocked: () => console.log("Hold Blocked"),
      doHoldGrayout: () => {},
      onHoldLimitReset: () => {},
      setDcd: () => {},
    });
    let inputReceiver = new InputReceiver();
    inputReceiver.updateAssignments(playerSettings.keyAssignments);
    drawer.setShapeSet(shapeDict);
    drawer.setGridCount(new XY(gameSettings.fieldWidth, gameSettings.fieldHeight));
    drawer.setNextAndHoldCount(gameSettings.nextCount, gameSettings.holdCount);
    drawer.redrawFields();
    let gameCycle = new GameCycle(field, kickTables, pieceBag, shapeDict, controller, inputReceiver, drawer, playerSettings, gameSettings);
    controller.settings.doHoldGrayout = (count: number) => {gameCycle.holdColorChangeState = count};
    controller.settings.onHoldLimitReset = () => {gameCycle.holdColorChangeState = "restore"};
    controller.settings.setDcd = () => {gameCycle.emits.get("move")?.resetWithDcd()};

    return gameCycle;

    function clampSpawnsLowerEdge(value: number): number {
      if (value < 0) return 0;
      if (value > gameSettings.fieldHeight + fieldExtraHeight) return gameSettings.fieldHeight + fieldExtraHeight;
      return value;
    }
  }
}

export {GameCycle};