import {Shape, KickTable, KickTableSet} from "./v2logic";
import type {ShapeDict} from "./v2logic";
import type {KeyAssignments} from "./v2playersettings";

class KickTableSets {
  static readonly srsPlus_Gen = new KickTable({
    "cw": [
      [0,0,-2,0,1,0,-2,-1,1,2],
      [0,0,-1,0,2,0,-1,2,2,-1],
      [0,0,2,0,-1,0,2,1,-1,-2],
      [0,0,1,0,-2,0,1,-2,-2,1],
    ],
    "ccw": [
      [0,0,-1,0,2,0,-1,2,2,-1],
      [0,0,2,0,-1,0,2,1,-1,-2],
      [0,0,1,0,-2,0,1,-2,-2,1],
      [0,0,-2,0,1,0,-2,-1,1,2],
    ],
    "180": [
      [0,0,0,1,1,1,-1,1,1,0,-1,0],
      [0,0,0,-1,-1,-1,1,-1,-1,0,1,0],
      [0,0,1,0,1,2,1,1,0,2,0,1],
      [0,0,-1,0,-1,2,-1,1,0,2,0,1],
    ],
  });
  static readonly srsPlus_I = new KickTable({
    "cw": [
      [0,0,1,0,-2,0,-2,-1,1,2],
      [0,0,-1,0,2,0,-1,2,2,-1],
      [0,0,2,0,-1,0,2,1,-1,-2],
      [0,0,1,0,-2,0,1,-2,-2,1],
    ],
    "ccw": [
      [0,0,-1,0,2,0,2,-1,-1,2],
      [0,0,1,0,-2,0,1,2,-2,-1],
      [0,0,-2,0,1,0,-2,1,1,-2],
      [0,0,-1,0,2,0,-1,-2,2,1],
    ],
    "180": [
      [0,0,0,-1],
      [0,0,-1,0],
      [0,0,0,1],
      [0,0,1,0],
    ],
  });
  static readonly srsPlusSet = new KickTableSet({
    "Gen": this.srsPlus_Gen,
    "I": this.srsPlus_I,
  }, {
    "I": "I",
    "O": "Gen",
    "T": "Gen",
    "L": "Gen",
    "J": "Gen",
    "S": "Gen",
    "Z": "Gen",
  })
}

class ShapeSets {
  static readonly standard: ShapeDict = {
    I: new Shape("I", [[0, 2], [1, 2], [2, 2], [3, 2]], 4),
    O: new Shape("O", [[1, 1], [1, 2], [2, 1], [2, 2]], 4),
    T: new Shape("T", [[1, 2], [0, 1], [1, 1], [2, 1]], 3),
    L: new Shape("L", [[2, 2], [0, 1], [1, 1], [2, 1]], 3),
    J: new Shape("J", [[0, 2], [0, 1], [1, 1], [2, 1]], 3),
    S: new Shape("S", [[1, 2], [2, 2], [0, 1], [1, 1]], 3),
    Z: new Shape("Z", [[0, 2], [1, 2], [1, 1], [2, 1]], 3),
  }
}

class Blocks {
  static readonly empty = ".";
  static readonly neutral = "#";

  static readonly standard = ["I", "O", "T", "L", "J", "S", "Z"];


}

class BagSets {
  static readonly bag7 = ["I", "O", "T", "L", "J", "S", "Z"];
  static readonly bag14 = this.bag7.concat(this.bag7);
}

class KeyAssignmentPresets {
  static readonly defaults: KeyAssignments = new Map(Object.entries({
    moveLeft: [
      {"key": "ArrowLeft", "func": []}
    ],
    moveRight: [
      {"key": "ArrowRight", "func": []}
    ],
    softDrop: [
      {"key": "ArrowDown", "func": []}
    ],
    hardDrop: [
      {"key": "ArrowUp", "func": []}
    ],
    rotateCCW: [
      {"key": "KeyZ", "func": []}
    ],
    rotateCW: [
      {"key": "KeyX", "func": []}
    ],
    rotate180: [
      {"key": "KeyC", "func": []}
    ],
    hold: [
      {"key": "ShiftLeft", "func": []}
    ],
    pause: [
      {"key": "KeyQ", "func": []}
    ],
    retry: [
      {"key": "KeyR", "func": []}
    ],
    exit: [
      {"key": "Escape", "func": []}
    ],
    undo: [
      {"key": "KeyZ", "func": ["ctrl"]}
    ],
    redo: [
      {"key": "KeyY", "func": ["ctrl"]}
    ]
  }));
}

export {ShapeSets, BagSets, Blocks, KickTableSets, KeyAssignmentPresets};