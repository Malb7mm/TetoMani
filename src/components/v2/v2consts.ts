import {Shape, KickTable, KickTableSet} from "./v2logic";

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
  static readonly shapes: { [key: string]: Shape } = {
    I: new Shape([[0, 2], [1, 2], [2, 2], [3, 2]], 4),
    O: new Shape([[1, 1], [1, 2], [2, 1], [2, 2]], 4),
    T: new Shape([[1, 2], [0, 1], [1, 1], [2, 1]], 3),
    L: new Shape([[2, 2], [0, 1], [1, 1], [2, 1]], 3),
    J: new Shape([[0, 2], [0, 1], [1, 1], [2, 1]], 3),
    S: new Shape([[1, 2], [2, 2], [0, 1], [1, 1]], 3),
    Z: new Shape([[0, 2], [1, 2], [1, 1], [2, 1]], 3),
  }
}

class BlockSets {
  static readonly empty = ".";
  static readonly neutral = "#";

  static readonly standard = ["I", "O", "T", "L", "J", "S", "Z"];
}

class BagSets {
  static readonly bag7 = ["I", "O", "T", "L", "J", "S", "Z"];
  static readonly bag14 = this.bag7.concat(this.bag7);
}

export {ShapeSets, BagSets, BlockSets, KickTableSets}