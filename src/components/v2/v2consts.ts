import {Shape} from "./v2logic";

class ShapeConsts {
  static readonly standard: { [key: string]: Shape } = {
    I: new Shape([[0, 2], [1, 2], [2, 2], [3, 2]], 4),
    O: new Shape([[1, 1], [1, 2], [2, 1], [2, 2]], 4),
    T: new Shape([[1, 2], [0, 1], [1, 1], [2, 1]], 3),
    L: new Shape([[2, 2], [0, 1], [1, 1], [2, 1]], 3),
    J: new Shape([[0, 2], [0, 1], [1, 1], [2, 1]], 3),
    S: new Shape([[1, 2], [2, 2], [0, 1], [1, 1]], 3),
    Z: new Shape([[0, 2], [1, 2], [1, 1], [2, 1]], 3),
  }
}

export {ShapeConsts}