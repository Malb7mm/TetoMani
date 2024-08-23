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
  shapes: XY[][];

  constructor(shapeCoords: number[][], isEven: boolean = false) {
    this.shapes = Array(4).fill(Array(4));

    for (let i = 0; i < 4; i++) {
      let x = shapeCoords[i][0];
      let y = shapeCoords[i][1];
      let maxIndex = isEven ? 3 : 2;
      
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
}