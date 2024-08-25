/// <reference lib="es2021" />

type BlockSet = string[];
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
    this.shapes = Array(4).fill(Array(width));

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

type BagElementType = "single" | "grouped" | "random-grouped";

class PieceBagElement {
  consumedCount: number = 0;
  elementType: BagElementType;
  doMidwayTerminate: boolean;
  terminate: number;
  value: PieceBagElement[] | string;
  queue: string[] = [];

  constructor(elementType: "single", value: string);
  constructor(elementType: "grouped");
  constructor(elementType: "random-grouped", terminate: number);
  constructor(elementType: BagElementType, arg2?: any) {
    this.elementType = elementType;
    this.value = (typeof arg2 === "string") ? arg2 : [];
    this.terminate = (typeof arg2 === "number") ? arg2 : (elementType === "single") ? 1 : 0;
    this.doMidwayTerminate = typeof arg2 === "number";
  }

  shallowCopy(): PieceBagElement {
    if (typeof this.value === "string") {
      return new PieceBagElement("single", this.value);
    }
    else if (this.value instanceof Array) {
      let e: PieceBagElement;
      if (this.elementType === "grouped")
        e = new PieceBagElement("grouped");
      else
        e = new PieceBagElement("random-grouped", this.terminate);
      e.add(this.value);
      return e;
    }
    else { // 分岐することはない（コンパイラ用）
      throw new Error("");
    }
  }

  add(elements: PieceBagElement[]) {
    if (this.value instanceof Array)
      for (let e of elements)
        this.value.push(e);
      if (!this.doMidwayTerminate)
        this.terminate = this.value.length;
  }

  getValuesSorted(): string[] {
    let queue = this.queue.slice();

    queue.sort(PieceBagElement.blockComparer);
    return queue;
  }

  static blockComparer(a: string, b: string): number {
    let result = 0;
    let tetrominos = ["I", "O", "T", "L", "J", "S", "Z"];
    for (let i = 0; i < tetrominos.length; i++) {
      for (let j = i + 1; j < tetrominos.length; j++) {
        result = beMinusIfMatched(tetrominos[i], tetrominos[j]) ?? result;
      }
    }
    if (result != 0) return result;
    return a.localeCompare(b);
    
    function beMinusIfMatched(former: string, latter: string): number | undefined {
      if (a === former && b === latter)
        return -1;
      if (b === former && a === latter)
        return 1;
      return undefined;
    }
  }

  generateQueue(): string[] {
    let elements = this.value;
    if (this.elementType === "random-grouped" && elements instanceof Array) {
      for (let i = elements.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = elements[i];
        elements[i] = elements[j];
        elements[j] = tmp;
      }
      elements = elements.slice(0, this.terminate);
    }

    if (typeof elements === "string") {
      this.queue = [elements];
    }
    else {
      let queue: string[] = [];
      for (let element of elements)
        queue.push(...element.generateQueue());
      this.queue = queue;
    }

    return this.queue;
  }

  addQueueFromLastElement(): string[] {
    if (!(this.value instanceof Array))
        return [];
    let additionalQueue = this.value[this.value.length - 1].generateQueue();
    this.queue = this.queue.concat(additionalQueue);
    return additionalQueue;
  }

  isAllConsumed(): boolean {
    return this.consumedCount === this.terminate;
  }

  pick(): string | undefined {
    if (this.isAllConsumed())
      return;
    
    if (this.value instanceof Array) {
      if (!this.value[this.consumedCount].isAllConsumed()) {
        this.value[this.consumedCount].pick();
        if (this.value[this.consumedCount].isAllConsumed())
          this.consumedCount ++;
      }
      else
        this.consumedCount++;
    }
    else { // this.elementType === "single"
      this.consumedCount = 1;
    }

    return this.queue.shift();
  }
}

class PieceBagBracket {
  elements: PieceBagElement[] = [];
  brac: string;
  bracAt: number;

  constructor(leftBracket: string, leftBracketAt: number) {
    this.brac = leftBracket;
    this.bracAt = leftBracketAt;
  }

  isMatched(c: string): boolean {
    if (this.brac === "(" && c === ")") return true;
    if (this.brac === "[" && c === "]") return true;
    return false;
  }
}

class PieceBag {
  elementRoot: PieceBagElement;
  doLoopLastElement: boolean = false;

  constructor(bagPattern: string, blockSet: BlockSet) {
    bagPattern = bagPattern.replaceAll("@", "IOTLJSZ");
    let stack: PieceBagBracket[] = [
      new PieceBagBracket("head", 0),
    ];

    for (let i = 0; i < bagPattern.length; i++) {
      let c = bagPattern[i];

      if (i === bagPattern.length - 1 && c === "~")
        this.doLoopLastElement = true;
      else if (c === "*") {
        let repeatInfo = getRepeatCount(i);
        i += repeatInfo.skipIndex;
        for (let j = 0; j < repeatInfo.count; j++) {
          stack[0].elements.push(stack[0].elements[stack[0].elements.length - 1].shallowCopy());
        }
      }
      else if (c === "(" || c === "[") {
        stack.unshift(new PieceBagBracket(c, i));
      }
      else if (stack[0].isMatched(c)) {
        let e: PieceBagElement;
        if (c === ")")
          e = new PieceBagElement("grouped");
        else if (c === "]")
          e = new PieceBagElement("random-grouped", getTerminate(stack[0].bracAt, i, stack[0].elements.length));
        else continue;

        e.add(stack[0].elements);
        stack[1].elements.push(e);
        stack.shift();
      }
      else {
        if (blockSet.includes(c))
          stack[0].elements.push(new PieceBagElement("single", c));
      }
    }

    this.elementRoot = new PieceBagElement("grouped");
    this.elementRoot.add(stack[0].elements);

    function getTerminate(beginIndex: number, endIndex: number, defaultv: number): number {
      let s = bagPattern.slice(beginIndex + 1, endIndex).split(":");
      if (s.length <= 1) return defaultv;
      let result = Number.parseInt(s[1]);
      if (isNaN(result)) return defaultv;
      return result;
    }

    function getRepeatCount(beginIndex: number): {count: number, skipIndex: number} {
      let s = bagPattern.slice(beginIndex + 1);
      let match = s.match(/^\d+/);
      if (match) 
        return {count: parseInt(match[0]) - 1, skipIndex: match[0].length};
      return {count: 0, skipIndex: 0};
    }
  }

  pickNext(): string | undefined {
    if (this.elementRoot.isAllConsumed())
      if (this.doLoopLastElement)
        this.elementRoot.addQueueFromLastElement();
      else
        return undefined;
    return this.elementRoot.pick();
  }

  getNexts(count: number): string[] {
    if (this.doLoopLastElement)
      while (this.elementRoot.queue.length < count)
        this.elementRoot.addQueueFromLastElement();
    return this.elementRoot.queue.slice(0, count);
  }

  getVirtualNexts(bagCount: number): String[][] {
    if (!(this.elementRoot.value instanceof Array))
      throw new Error("for compiler");
    let result: String[][] = [];
    let cnt = 0;
    for (let element of this.elementRoot.value) {
      if (element.isAllConsumed()) continue;
      let virtualNexts = element.getValuesSorted();
      result.push(virtualNexts);

      cnt++;
      if (cnt == bagCount) break;
    }
    return result;
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
export type {BlockSet as BagSet};