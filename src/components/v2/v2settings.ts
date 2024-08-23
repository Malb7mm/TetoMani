type KickTableType = "SRS+";
type shapeSetType = "standard";
type bagType = "7bag" | "14bag";

class GameSettings {
  fieldWidth: number = 10;
  fieldHeight: number = 20;

  kickTable: KickTableType = "SRS+";
  shapeSet: shapeSetType = "standard";
  bag: bagType = "7bag";

  customBag: boolean = false;
  customBagControl: string = "";
  resetOnRunOutBag: boolean = true;

  enableUndo: boolean = false;
  enableQuickSave: boolean = false;

  toJSON() {
    return {
      field: {
        width: this.fieldWidth,
        height: this.fieldHeight,
      },
      gameSetting: {
        kickTable: this.kickTable,
        shapeSet: this.shapeSet,
        bag: this.bag,
      },
      functions: {
        customBag: this.customBag,
        customBagControl: this.customBagControl,
        resetOnRunOutBag: this.resetOnRunOutBag,
        enableUndo: this.enableUndo,
        enableQuickSave: this.enableQuickSave,
      },
    }
  }

  static loadJSON(parsedData: any): GameSettings {
    let result = new GameSettings();
    result.fieldWidth = parsedData.field.width;
    result.fieldHeight = parsedData.field.height;
    result.kickTable = parsedData.gameSetting.kickTable;
    result.shapeSet = parsedData.gameSetting.shapeSet;
    result.bag = parsedData.gameSetting.bag;
    result.customBag = parsedData.functions.customBag;
    result.customBagControl = parsedData.functions.customBagControl;
    result.resetOnRunOutBag = parsedData.functions.resetOnRunOutBag;
    result.enableUndo = parsedData.functions.enableUndo;
    result.enableQuickSave = parsedData.functions.enableQuickSave;
    return result;
  }
}