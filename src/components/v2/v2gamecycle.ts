import { Field, FieldPieceController, KickTableSet, PieceBag } from "./v2logic";
import type { ShapeDict } from "./v2logic";
import { GameSettings } from "./v2settings";
import { Blocks, KickTableSets, ShapeSets } from "./v2consts";

class GameCycle {
  field: Field;
  kickTables: KickTableSet;
  pieceBag: PieceBag;
  shapeDict: ShapeDict;
  fieldPieceController: FieldPieceController;

  constructor(field: Field, kickTables: KickTableSet, pieceBag: PieceBag, shapeDict: ShapeDict, fieldPieceController: FieldPieceController) {
    this.field = field;
    this.kickTables = kickTables;
    this.pieceBag = pieceBag;
    this.shapeDict = shapeDict;
    this.fieldPieceController = fieldPieceController;
  }
}

class GameInitializer {
  static createGameCycle(gameSettings: GameSettings): GameCycle {
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
    let gameCycle = new GameCycle(field, kickTables, pieceBag, shapeDict, controller);

    return gameCycle;
  }
}
