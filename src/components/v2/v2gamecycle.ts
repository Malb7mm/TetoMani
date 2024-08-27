import { Field, KickTableSet, PieceBag, FieldPiece, Shape, XY } from "./v2logic";
import type { ShapeDict, RotationType } from "./v2logic";
import { GameSettings } from "./v2settings";
import { Blocks, KickTableSets, ShapeSets } from "./v2consts";
import { InputReceiver } from "./v2inputreceiver";
import { PlayerSettings } from "./v2playersettings";

type FieldPieceSettings = {
  spawnsLowerEdgeMin: number;
  spawnsLowerEdgeMax: number;
  onNextOut: Function;
  onHoldBlocked: Function;
}

class FieldPieceController {
  field: Field;
  kickTables: KickTableSet;
  pieceBag: PieceBag;
  shapeDict: ShapeDict;

  piece: FieldPiece;
  holdedPiece: Shape | undefined = undefined;
  settings: FieldPieceSettings;

  constructor(field: Field, kickTables: KickTableSet, pieceBag: PieceBag, shapeDict: ShapeDict, settings: FieldPieceSettings) {
    this.field = field;
    this.kickTables = kickTables;
    this.pieceBag = pieceBag;
    this.shapeDict = shapeDict;
    this.settings = settings;

    let next = this.pieceBag.pickNext();
    if (next === undefined)
      throw new Error("No Next As Of Initialization");
    
    let newPiece = this.getPiece(next);
    if (newPiece === undefined)
      throw new Error("Already Blocked Out As Of Initialization");
    this.piece = newPiece;
  }

  getFieldPiece(): FieldPiece {
    return this.piece;
  }

  moveLeft(count: number) {
    let dx;
    for (dx = 0; dx < count; dx++) {
      if (this.field.isOverlap(this.piece.movedOf(new XY(-dx - 1, 0))))
        break;
    }
    this.piece = this.piece.movedOf(new XY(-dx, 0));
  }

  moveRight(count: number) {
    let dx;
    for (dx = 0; dx < count; dx++) {
      if (this.field.isOverlap(this.piece.movedOf(new XY(dx + 1, 0))))
        break;
    }
    this.piece = this.piece.movedOf(new XY(dx, 0));
  }

  softDrop(count: number) {
    let dy;
    for (dy = 0; dy < count; dy++) {
      if (this.field.isOverlap(this.piece.movedOf(new XY(0, -dy - 1))))
        break;
    }
    this.piece = this.piece.movedOf(new XY(0, -dy - 1));
  }

  hardDrop() {
    this.piece = this.field.getGroundedPiece(this.piece);
  }

  rotate(rotation: RotationType) {
    let kickResult = this.kickTables.getResult(this.piece, rotation, this.field.isOverlap);
    if (kickResult !== undefined) {
      this.piece = this.piece.rotated(rotation).movedOf(kickResult.xy);
    }
  }

  swapHold() {
    if (this.holdedPiece === undefined) {
      this.holdedPiece = this.piece.shape;
      this.pullNext();
    }
    else {
      let tmp = this.getPiece(this.holdedPiece.name);
      if (tmp === undefined) {
        this.settings.onHoldBlocked();
        return;
      }
      this.holdedPiece = this.piece.shape;
      this.piece = tmp;
    }
  }

  pullNext() {
    let next = this.pieceBag.pickNext();
    if (next === undefined) {
      this.settings.onNextOut();
      return;
    }

    let newPiece = this.getPiece(next);
    if (newPiece === undefined) {
      this.settings.onNextOut();
      return;
    }
    this.piece = newPiece;
  }

  private getPiece(pieceName: string): FieldPiece | undefined {
    let newPiece = new FieldPiece(this.shapeDict[pieceName], this.settings.spawnsLowerEdgeMin);
    while (this.field.isOverlap(newPiece)) {
      newPiece = newPiece.movedTo(new XY(0, 1));
      if (newPiece.xy.y === this.settings.spawnsLowerEdgeMin)
        return undefined;
    }
    return newPiece;
  }
}

class GameCycle {
  field: Field;
  kickTables: KickTableSet;
  pieceBag: PieceBag;
  shapeDict: ShapeDict;
  fieldPieceController: FieldPieceController;
  inputReceiver: InputReceiver;

  constructor(field: Field, kickTables: KickTableSet, pieceBag: PieceBag, shapeDict: ShapeDict, fieldPieceController: FieldPieceController, inputReceiver: InputReceiver) {
    this.field = field;
    this.kickTables = kickTables;
    this.pieceBag = pieceBag;
    this.shapeDict = shapeDict;
    this.fieldPieceController = fieldPieceController;
    this.inputReceiver = inputReceiver;
  }
}

class GameInitializer {
  static createGameCycle(gameSettings: GameSettings, playerSettings: PlayerSettings): GameCycle {
    let field = new Field({
      width: gameSettings.fieldWidth,
      height: gameSettings.fieldHeight,
      topOutHeight: gameSettings.fieldHeight + 20,
      blockSet: Blocks[gameSettings.blockSet],
      emptyBlock: Blocks.empty,
    });
    let kickTables = KickTableSets[gameSettings.kickTable];
    let pieceBag = new PieceBag(gameSettings.bagPattern, Blocks[gameSettings.blockSet]);
    let shapeDict = ShapeSets[gameSettings.shapeSet];
    let controller = new FieldPieceController(field, kickTables, pieceBag, shapeDict, {
      spawnsLowerEdgeMin: gameSettings.spawnY,
      spawnsLowerEdgeMax: gameSettings.spawnYMax,
      onNextOut: () => console.log("Next Out"),
      onHoldBlocked: () => console.log("Hold Blocked"),
    });
    let inputReceiver = new InputReceiver();
    inputReceiver.updateAssignments(playerSettings.keyAssignments);
    let gameCycle = new GameCycle(field, kickTables, pieceBag, shapeDict, controller, inputReceiver);

    return gameCycle;
  }
}
