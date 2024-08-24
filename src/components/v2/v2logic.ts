type BagSet = string[];
type RotationType = "cw" | "ccw" | "180";
type Direction = 0 | 1 | 2 | 3;

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

  add(xy: XY): XY {
    return new XY(this.x + xy.x, this.y + xy.y);
  }
}

class Shape {
  // XY[向き][i番目のブロック]の座標
  shapes: XY[][]

  constructor(shapeCoords: number[][], width: number | undefined = undefined) {
    if (width === undefined)
      width = Math.max(...shapeCoords.flat());
    this.shapes = Array(width).fill(Array(width));

    for (let i = 0; i < shapeCoords.length; i++) {
      let x = shapeCoords[i][0];
      let y = shapeCoords[i][1];
      let maxIndex = width - 1;
      
      this.shapes[0][i] = new XY(x, y);
      for (let direction = 1; direction < 4; direction++) {
        // 右回りに格納
        this.shapes[direction][i] = new XY(maxIndex - y, x);
      }
    }
  }

  get(rotation: Direction): XY[] {
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

class PieceBag {
  pieces: string[];
  bagSet: BagSet;

  constructor(bagSet: string[]) {
    this.pieces = [];
    this.bagSet = bagSet;
    this.restock();
  }

  pickNext(): string {
    if (this.pieces.length === 0)
      this.restock();
    return this.pieces.shift()!;
  }

  getNexts(count: number): string[] {
    while (this.pieces.length < count)
      this.restock();
    return this.pieces.slice(0, count);
  }

  private restock() {
    let newBag = [...this.bagSet];
    for (let i = newBag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = newBag[i];
      newBag[i] = newBag[j];
      newBag[j] = tmp;
    }
    this.pieces = this.pieces.concat(newBag);
  }
}

class KickTableSet {
  tables: { [key: string]: KickTable };
  shapeMap: { [key: string]: string };

  constructor(tables: { [key: string]: KickTable }, shapeMap: { [key: string]: string } ) {
    this.tables = tables;
    this.shapeMap = shapeMap;
  }

  getResult(shape: string, xy: XY, direction: Direction, rotation: RotationType, collider: (shape: string, xy: XY, direction: Direction) => boolean): {xy: XY, kickNumber: number} | undefined {
    return this.tables[this.shapeMap[shape]].getResult(shape, xy, direction, rotation, collider);
  }
}

class KickTable {
  static InnerTable = class {
    table: XY[][] = Array(4);

    constructor(values: number[][]) {
      for (let i = 0; i < 4; i++) {
        this.table[i] = Array(Math.floor(values[i].length / 2));
  
        for (let j = 0; j + 1 < values[i].length; j++) {
          this.table[i][j] = new XY(values[i][j], values[i][j + 1]);
        }
      }
    };
  }

  tables: { [key in RotationType]: InstanceType<typeof KickTable.InnerTable> } 

  constructor(args: { [key in RotationType]: [number[], number[], number[], number[]] }) {
    this.tables = {
      cw: new KickTable.InnerTable(args["cw"]),
      ccw: new KickTable.InnerTable(args["ccw"]),
      180: new KickTable.InnerTable(args["180"]),
    };
  }

  getResult(shape: string, xy: XY, direction: Direction, rotation: RotationType, collider: (shape: string, xy: XY, direction: Direction) => boolean): {xy: XY, kickNumber: number} | undefined {
    let table = this.tables[rotation].table[direction];
    let newDirection = this.getNewDirection(direction, rotation);
    for (let i = 0; i < table.length; i++) {
      if (collider(shape, xy.add(table[i]), newDirection))
        continue;
      return {xy: xy.add(table[i]), kickNumber: i};
    }
    return undefined;
  }

  private getNewDirection(direction: Direction, rotation: RotationType): Direction {
    const addends = {"cw": 1, "180": 2, "ccw": 3};
    let newDirection = (direction + addends[rotation]) % 4;
    if (newDirection === 3) return 3;
    if (newDirection === 2) return 2;
    if (newDirection === 1) return 1;
    return 0;
  }
}

class Field {
  
}

export {Shape, PieceBag, KickTable, KickTableSet};
export type {BagSet};