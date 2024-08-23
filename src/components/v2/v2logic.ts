/**
 * Yは0が下！
 */
class XY {
  x: number = 0;
  y: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

enum Direction {
  FRONT = 0,
  CROCKWISE,
  UPSIDE_DOWN,
  COUNTER_CROCKWISE,
}

class Shape {
  // XY[向き][i番目のブロック]の座標
  shapes: XY[][]

  constructor(shapeCoords: number[][], width: number | undefined = undefined) {
    if (width === undefined)
      width = Math.max(...shapeCoords.flat());
    this.shapes = Array(width).fill(Array(width));

    for (let i = 0; i < 4; i++) {
      let x = shapeCoords[i][0];
      let y = shapeCoords[i][1];
      let maxIndex = width - 1;
      
      this.shapes[0][i] = new XY(x, y);
      for (let j = 1; j < 4; j++) {
        // 右回りに格納
        this.shapes[j][i] = new XY(maxIndex - y, x);
      }
    }
  }

  get(rotation: number): XY[] {
    return this.shapes[rotation];
  }

  spawnsAt(lowerEdge: number): XY {
    // 正面のシェイプ
    let xCoords = this.shapes[0].map(e => e.x);
    let yCoords = this.shapes[0].map(e => e.y);

    // Xは幅が偶数なら中央、奇数なら中央左寄り
    // 例：幅4はX=3、幅3もX=3、幅2はX=4
    let width = Math.max(...xCoords) - Math.min(...xCoords);
    let x = 5 - Math.ceil(width / 2);

    // Yはブロックの下端が常に同じ高さにつくように
    let y = lowerEdge - Math.min(...yCoords);

    return new XY(x, y);
  }
}

export {Shape};