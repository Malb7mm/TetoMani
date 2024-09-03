import { Field, KickTableSet, PieceBag, FieldPiece, Shape, XY } from "./v2logic";
import type { ShapeDict, RotationType } from "./v2logic";
import { GameSettings } from "./v2settings";
import { Blocks, KickTableSets, ShapeSets } from "./v2consts";
import { InputReceiver } from "./v2inputreceiver";
import { PlayerSettings } from "./v2playersettings";
import { Drawer } from "./v2drawer";
import { AssetsLoader } from "./v2assetsloader";
import type { HowlOptions } from "howler";
import type { NumberLiteralType } from "typescript";
const msPerFrame = 1000 / 60;

type FieldPieceSettings = {
  spawnsLowerEdgeMin: number;
  spawnsLowerEdgeMax: number;
  holdCount: number;
  holdSwappableCount: "infinite" | "oneCycle" | number;
  onNextOut?: Function;
  onBlockOut?: Function;
  onHoldBlocked?: Function;
  onLockdown?: Function;
  doHoldGrayout?: Function;
  onHoldLimitReset?: Function;
  onHold?: Function;
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
      this.settings.onHoldBlocked?.();
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
    this.settings.doHoldGrayout?.(Math.max(0, this.settings.holdCount - swapLeft));
    this.settings.onHold?.();
  }

  private pullNext() {
    let next = this.pieceBag.pickNext();
    if (next === undefined) {
      this.settings.onNextOut?.();
      return;
    }

    let newPiece = this.getNewPiece(next);
    if (newPiece === undefined) {
      this.settings.onBlockOut?.();
      return;
    }
    this.piece = newPiece;
  }

  lockdown() {
    this.field.setPieceBlocks(this.piece);
    this.field.clearFilledLines((number) => {});
    this.holdSwapped = 0;
    this.pullNext();
    this.settings.onHoldLimitReset?.();
    this.settings.onLockdown?.();
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

type InputEmitterArgs = {
  definedControls: InputEmitterDefinedControls, 
  delayFrame?: number, 
  dasFrame?: number, 
  arrFrame?: number, 
  dcdFrame?: number, 
  dasCancel?: boolean
}

type InputEmitterDefinedControls = {
  inquireTo?: () => boolean, 
  execution?: () => void, 
  isContinuable?: () => boolean
  logMovedCount?: (movedCount: number) => void,
  onCancelled?: () => void,
  onCompleted?: () => void,
  onStopped?: () => void,
}[];

class InputEmitter {
  private definedControls: InputEmitterDefinedControls = [];
  private delayMs: number;
  private dasMs: number;
  private arrMs: number;
  private dcdMs: number;
  private dasCancel: boolean;

  private lockUntil: number | undefined;
  private prevIndex: number | undefined;
  private inputSince: (number | undefined)[] = [];
  private lastAt: number | undefined;
  private firstAt: number | undefined;
  private secondAt: number | undefined;

  constructor(args: InputEmitterArgs) {
    this.definedControls = args.definedControls;
    this.inputSince = Array(this.definedControls.length).fill(undefined);
    this.delayMs = (args.delayFrame ?? 0) * msPerFrame;
    this.dasMs = (args.dasFrame ?? 0) * msPerFrame;
    this.arrMs = (args.arrFrame ?? -1) * msPerFrame;
    this.dcdMs = (args.dcdFrame ?? -1) * msPerFrame;
    this.dasCancel = args.dasCancel ?? true;
  }

  emit() {
    let index = this.getLatestInputIndex();
    let prevIndex = this.prevIndex;
    this.prevIndex = index;
    if (index !== prevIndex && prevIndex !== undefined) {
      this.definedControls[prevIndex].onStopped?.();
    }
    if (index === undefined) {
      return;
    }
    let func = this.definedControls[index];

    if (index !== prevIndex) {
      this.lastAt = 0;
      if (this.dasCancel && prevIndex !== undefined && index === this.getEarliestInputIndex()) {
        this.firstAt = this.secondAt = Date.now();
      }
      else {
        this.firstAt = Date.now() + this.delayMs;
        this.secondAt = this.firstAt + this.dasMs;
      }
    }

    if (this.lockUntil !== undefined && Date.now() < this.lockUntil)
      return;

    const now = Date.now();
    let next = this.getNextExecutionTime();
    let movedCount = 0;
    let cancelled = false;

    if (!isContinuable())
      return;
    while (next !== undefined && next <= now) {
      this.lastAt = next;
      func.execution?.();
      movedCount++;
      if (!isContinuable()) {
        this.lastAt = Date.now();
        cancelled = true;
        break;
      }
      next = this.getNextExecutionTime();
    }
    
    if (movedCount > 0) {
      func.logMovedCount?.(movedCount);
      if (cancelled)
        func.onCancelled?.();
      else
        func.onCompleted?.();
    }

    function isContinuable() {
      return func.isContinuable?.() ?? true;
    }
  }

  private getLatestInputIndex(): number | undefined {
    this.updateInputSince();

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

  private getEarliestInputIndex(): number | undefined {
    this.updateInputSince();

    let result = undefined;
    let min = Infinity;
    for (let i = 0; i < this.inputSince.length; i++) {
      let inputSince = this.inputSince[i];
      if (inputSince !== undefined && min > inputSince) {
        min = inputSince;
        result = i;
      }
    }
    return result;
  }

  private updateInputSince() {
    const now = Date.now();
    for (let i = 0; i < this.inputSince.length; i++) {
      if (this.inputSince[i] === undefined && (this.definedControls[i].inquireTo?.() ?? false))
        this.inputSince[i] = now;
      else if (!(this.definedControls[i].inquireTo?.() ?? true))
        this.inputSince[i] = undefined;
    }
  }

  resetWithDcd() {
    if (this.getLatestInputIndex() === undefined)
      return;
    if (this.lastAt === undefined)
      return;
    this.firstAt = this.secondAt = this.lastAt + this.dcdMs;
    this.lastAt = 0;
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

type GameCycleArgs = {
  field: Field;
  kickTables: KickTableSet;
  pieceBag: PieceBag;
  shapeDict: ShapeDict;
  fieldPieceController: FieldPieceController;
  inputReceiver: InputReceiver;
  drawer: Drawer;
  gameSettings: GameSettings;
  playerSettings: PlayerSettings;
  params: {
    freefallInterval: number;
    lockdownAvoidanceLimit: number;
    lockdownAvoidanceDuration: number;
  }
}

class GameCycle {
  field: Field;
  kickTables: KickTableSet;
  pieceBag: PieceBag;
  shapeDict: ShapeDict;
  controller: FieldPieceController;
  inputReceiver: InputReceiver;
  drawer: Drawer;
  gameSettings: GameSettings;
  playerSettings: PlayerSettings;

  emits: Map<string, InputEmitter> = new Map();
  audioLoader: AssetsLoader = new AssetsLoader();
  audios: Map<string, Howl>;

  static readonly audioOptions = new Map<string, HowlOptions>([
    ["tap", { 
      src: ["snd/tap_high.ogg", "snd/tap_high.mp3"],
      volume: 0.1,
    }],
    ["wallTap", { 
      src: ["snd/tap_high.ogg", "snd/tap_high.mp3"],
      volume: 0.2,
    }],
    ["softDrop", { 
      src: ["snd/tap_high.ogg", "snd/tap_high.mp3"],
      volume: 0.01,
    }],
    ["lockdown", { 
      src: ["snd/tap.ogg", "snd/tap.mp3"],
      volume: 0.1,
    }],
    ["noise", { 
      src: ["snd/noise.ogg", "snd/noise.mp3"],
      volume: 0.03,
    }],
  ]);

  constructor(args: GameCycleArgs) {
    this.field = args.field;
    this.kickTables = args.kickTables;
    this.pieceBag = args.pieceBag;
    this.shapeDict = args.shapeDict;
    this.controller = args.fieldPieceController;
    this.inputReceiver = args.inputReceiver;
    this.drawer = args.drawer;
    this.gameSettings = args.gameSettings;
    this.playerSettings = args.playerSettings;

    this.audioLoader.addAudioPaths(GameCycle.audioOptions);
    this.audioLoader.loadAudios();
    this.audios = this.audioLoader.getAllAudios();

    this.freefallInterval = args.params.freefallInterval;
    this.lockdownAvoidanceLimit = args.params.lockdownAvoidanceLimit;
    this.lockdownAvoidanceDuration = args.params.lockdownAvoidanceDuration;

    this.emits.set("rotateCW", new InputEmitter({
      definedControls: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("rotateCW")},
          execution: () => {this.controller.rotate("cw")},
          onCompleted: () => {this.audios.get("noise")?.play(); this.increaseAvoidanceCount()},
        }, 
      ], 
    }));
    this.emits.set("rotateCCW", new InputEmitter({
      definedControls: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("rotateCCW")},
          execution: () => {this.controller.rotate("ccw")},
          onCompleted: () => {this.audios.get("noise")?.play(); this.increaseAvoidanceCount()},
        }, 
      ], 
    }));
    this.emits.set("rotate180", new InputEmitter({
      definedControls: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("rotate180")},
          execution: () => {this.controller.rotate("180")},
          onCompleted: () => {this.audios.get("noise")?.play(); this.increaseAvoidanceCount()},
        }, 
      ], 
    }));
    this.emits.set("move", new InputEmitter({
      definedControls: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("moveLeft")},
          execution: () => {this.controller.moveLeft(1)},
          isContinuable: () => {return !this.field.isOverlap(this.controller.piece.movedTo(new XY(-1, 0)))},
          onCancelled: () => {this.audios.get("wallTap")?.play(); this.increaseAvoidanceCount()},
          onCompleted: () => {this.audios.get("tap")?.play(); this.increaseAvoidanceCount()},
        }, 
        {
          inquireTo: () => {return this.inputReceiver.isActive("moveRight")},
          execution: () => {this.controller.moveRight(1)},
          isContinuable: () => {return !this.field.isOverlap(this.controller.piece.movedTo(new XY(1, 0)))},
          onCancelled: () => {this.audios.get("wallTap")?.play(); this.increaseAvoidanceCount()},
          onCompleted: () => {this.audios.get("tap")?.play(); this.increaseAvoidanceCount()},
        },
      ], 
      arrFrame: args.playerSettings.handlings.autoRepeatRate_Frame,
      dasFrame: args.playerSettings.handlings.delayedAutoShift_Frame,
      dcdFrame: args.playerSettings.handlings.dasCancelDelay_Frame,
    }));
    this.emits.set("softDrop", new InputEmitter({
      definedControls: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("softDrop")},
          execution: () => {this.isSoftdropping = true; this.lastFreefallTime = Date.now()},
          onStopped: () => {this.isSoftdropping = false; this.lastFreefallTime = Date.now()},
        }, 
      ], 
    }));
    this.emits.set("hardDrop", new InputEmitter({
      definedControls: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("hardDrop")},
          execution: () => {this.controller.hardDrop()},
        }, 
      ], 
    }));
    this.emits.set("swapHold", new InputEmitter({
      definedControls: [
        {
          inquireTo: () => {return this.inputReceiver.isActive("hold")},
          execution: () => {this.controller.swapHold()},
          onCompleted: () => {this.audios.get("noise")?.play()},
        }, 
      ], 
    }));
  }

  processLoopIntervalID: number | undefined;
  drawLoopRequestID: number | undefined;

  start(processLoopHz: number) {
    this.resetFreefall();
    this.processLoopIntervalID = setInterval(() => this.processLoop(), 1000 / processLoopHz);

    const drawLoop = () => {
      this.drawLoop();
      this.drawLoopRequestID = requestAnimationFrame(drawLoop);
    }
    this.drawLoopRequestID = requestAnimationFrame(drawLoop);
  }

  stop() {
    if (this.processLoopIntervalID !== undefined)
      clearInterval(this.processLoopIntervalID);
    if (this.drawLoopRequestID !== undefined)
      cancelAnimationFrame(this.drawLoopRequestID);
  }

  isSoftdropping: boolean = false;
  lastFreefallTime: number = -Infinity;
  lastControlledTime: number = -Infinity;
  reachedPieceY: number = Infinity;
  lockdownAvoidance: number = 0;

  readonly freefallInterval: number;
  readonly lockdownAvoidanceLimit: number;
  readonly lockdownAvoidanceDuration: number;

  processLoop() {
    // 自然落下・ロックダウン
    const now = Date.now();

    let freefallInterval = this.freefallInterval;
    if (this.isSoftdropping)
      freefallInterval /= this.playerSettings.handlings.softDropFactor_Multiplier;

    while (now - this.lastFreefallTime > freefallInterval
          && !this.field.isOverlap(this.controller.piece.movedTo(new XY(0, -1)))) {
      this.controller.moveBottom(1);
      this.lastFreefallTime += freefallInterval;
      if (this.isSoftdropping)
        this.audios.get("softDrop")?.play();
    }
    this.judgeAndDoLockdown();

    // 入力受け取り・実行
    for (let emit of this.emits.values())
      emit.emit();
  }

  private judgeAndDoLockdown() {
    const now = Date.now();

    if (this.controller.piece.xy.y < this.reachedPieceY) {
      this.reachedPieceY = this.controller.piece.xy.y;
      this.lockdownAvoidance = 0;
      this.lastControlledTime = now;
    }

    if (this.field.isOverlap(this.controller.piece.movedTo(new XY(0, -1)))
        && (this.lockdownAvoidance >= this.lockdownAvoidanceLimit
            || now - this.lastControlledTime >= this.lockdownAvoidanceDuration)
    ) {
      this.controller.lockdown();
    }
  }

  private increaseAvoidanceCount() {
    this.lastControlledTime = Date.now();
    this.lockdownAvoidance++;
    if (this.lockdownAvoidance >= this.lockdownAvoidanceLimit) {
      this.controller.moveBottom(1);
      this.judgeAndDoLockdown();
    }
  }

  private resetFreefall() {
    this.lastFreefallTime = Date.now();
    this.lastControlledTime = Date.now();
    this.reachedPieceY = Infinity;
    this.lockdownAvoidance = 0;
  }

  holdColorChangeState: number | "restore" | "none" = "none";

  drawLoop() {
    // フィールド更新
    let fieldCopy = this.field.getArrayTransposed();
    let piece = this.controller.getPiece();
    let groundedPiece = this.field.getGroundedPiece(piece);
    for (let xy of groundedPiece.getAllBlocksXy()) {
      fieldCopy[xy.x][xy.y] = groundedPiece.shape.name + "t";
    }
    for (let xy of piece.getAllBlocksXy()) {
      fieldCopy[xy.x][xy.y] = piece.shape.name;
    }
    this.drawer.updateFieldBlocks(fieldCopy);

    // ネクスト・ホールド更新
    this.drawer.updateNextQueue(this.pieceBag.getNexts(this.gameSettings.nextCount));
    this.drawer.updateHoldQueue(this.controller.getHoldQueue());

    // ホールド更新後にホールド色変更
    if (typeof this.holdColorChangeState === "number")
      this.drawer.grayoutHolds(this.holdColorChangeState); 
    if (this.holdColorChangeState === "restore")
      this.drawer.restoreHoldsColor(); 
    this.holdColorChangeState = "none";

      // ダイヤモンド表示
    if (this.gameSettings.enableDirectionHint) {
      let pieceDiamondPos = piece.xy.add(piece.shape.diamondAt()).add(-0.5, -0.5);
      this.drawer.updateDiamond("piece", piece.shape.name, pieceDiamondPos);
      let ghostDiamondPos = groundedPiece.xy.add(piece.shape.diamondAt()).add(-0.5, -0.5);
      this.drawer.updateDiamond("ghost", piece.shape.name + "t", ghostDiamondPos);
    }
  }

  static createInstance(gameSettings: GameSettings, playerSettings: PlayerSettings, drawer: Drawer): GameCycle {
    const fieldExtraHeight = 20;
    const preventAccidentialHarddrop_Frame = 2;

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
    });
    let inputReceiver = new InputReceiver();
    inputReceiver.updateAssignments(playerSettings.keyAssignments);
    drawer.setShapeSet(shapeDict);
    drawer.setGridCount(new XY(gameSettings.fieldWidth, gameSettings.fieldHeight));
    drawer.setNextAndHoldCount(gameSettings.nextCount, gameSettings.holdCount);
    drawer.redrawFields();
    let gameCycle = new GameCycle({
      field, 
      kickTables, 
      pieceBag, 
      shapeDict, 
      fieldPieceController: 
      controller, 
      inputReceiver, 
      drawer, 
      playerSettings, 
      gameSettings,
      params: {
        freefallInterval: (1 / gameSettings.gravity_blockPerFrame) * msPerFrame,
        lockdownAvoidanceLimit: gameSettings.allowInfinityMove ? Infinity : 15,
        lockdownAvoidanceDuration: gameSettings.lockdownTime_sec * 1000,
      },
    });

    controller.settings.onBlockOut = () => {gameCycle.stop()};
    controller.settings.onNextOut = () => {gameCycle.stop()};
    controller.settings.doHoldGrayout = (count: number) => {gameCycle.holdColorChangeState = count};
    controller.settings.onHoldLimitReset = () => {gameCycle.holdColorChangeState = "restore"};

    const onLockdown = () => {
      gameCycle.emits.get("move")?.resetWithDcd();
      if (playerSettings.handlings.doLockHardDrop)
        gameCycle.emits.get("hardDrop")?.setLockTimer(preventAccidentialHarddrop_Frame * msPerFrame);
      gameCycle.resetFreefall();
    }

    controller.settings.onLockdown = () => {
      gameCycle.audios.get("lockdown")?.play();
      onLockdown();
    };
    controller.settings.onHold = () => {
      onLockdown();
    }

    return gameCycle;

    function clampSpawnsLowerEdge(value: number): number {
      if (value < 0) return 0;
      if (value > gameSettings.fieldHeight + fieldExtraHeight) return gameSettings.fieldHeight + fieldExtraHeight;
      return value;
    }
  }
}

export {GameCycle};