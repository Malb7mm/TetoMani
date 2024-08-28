/**
 * Yは0が下！
 */
class XY implements Iterable<number> {
  x: number = 0;
  y: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(xy: XY): XY;
  add(x: number, y: number): XY;
  add(arg1: any, arg2?: any): XY {
    if (arg1 instanceof XY)
      return new XY(this.x + arg1.x, this.y + arg1.y);
    else
      return new XY(this.x + arg1, this.y + arg2);
  }

  mul(multiplier: number): XY;
  mul(xy: XY): XY;
  mul(x: number, y: number): XY;
  mul(arg1: any, arg2?: any): XY {
    if (arg1 instanceof XY)
      return new XY(this.x * arg1.x, this.y * arg1.y);
    if (arg2 !== undefined)
      return new XY(this.x * arg1, this.y * arg2);
    else
      return new XY(this.x * arg1, this.y * arg1);
  }

  get half(): XY {
    return new XY(this.x / 2, this.y / 2);
  }

  get minus(): XY {
    return new XY(-this.x, -this.y);
  }

  get minusX(): XY {
    return new XY(-this.x, this.y);
  }

  get minusY(): XY {
    return new XY(this.x, -this.y);
  }

  get onlyX(): XY {
    return new XY(this.x, 0);
  }

  get onlyY(): XY {
    return new XY(0, this.y);
  }

  [Symbol.iterator](): Iterator<number> {
    let index = 0;
    let array = [this.x, this.y];

    return {
      next(): IteratorResult<number> {
        if (index < array.length)
          return {value: array[index++], done: false};
        else
          return {value: undefined, done: true};
      }
    }
  }

  toString(): string {
    return `(${this.x}, ${this.y})`
  }
}

export {XY};