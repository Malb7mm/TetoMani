type KickTableType = "SRS+";
type shapeSetType = "standard";

class GameSettings {
  static readonly version: number = 1;

  fieldWidth: number = 10;
  fieldHeight: number = 20;

  kickTable: KickTableType = "SRS+";
  shapeSet: shapeSetType = "standard";
  nextCount: number = 5;

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