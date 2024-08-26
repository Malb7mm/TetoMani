type KickTableType = "srsPlusSet";
type ShapeSetType = "standard";
type BlockSetType = "standard";

class GameSettings {
  static readonly version: number = 1;

  fieldWidth: number = 10;
  fieldHeight: number = 20;

  kickTable: KickTableType = "srsPlusSet";
  shapeSet: ShapeSetType = "standard";
  blockSet: BlockSetType = "standard";
  nextCount: number = 5;
  spawnY: number = 22;
  spawnYMax: number = 22;

  bagPattern: string = "";
  resetOnRunOutBag: boolean = true;

  enableUndo: boolean = false;
  enableQuickSave: boolean = false;
  enableShowVirtualNext: boolean = false;
  virtualNextBagCount: number = 0;

  static loadJSON(json: string): GameSettings | undefined {
    let obj = JSON.parse(json);
    if (obj.version === GameSettings.version)
      return Object.assign(new GameSettings(), json);
  }
}

export {GameSettings};