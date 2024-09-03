class FpsCounter {
  fpsMeasureBegin: number = Date.now();
  fpsCount: number = 0;
  fpsValue: number = 0;
  prevLogging: number = Date.now() - 1000;
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  get(): number {
    if (Date.now() - this.fpsMeasureBegin >= 1000) {
      this.fpsValue = this.fpsCount;
      this.fpsCount = 0;
      this.fpsMeasureBegin += 1000;
    }
    this.fpsCount++;
    return this.fpsValue;
  }

  log(interval: number) {
    this.get();
    if (this.prevLogging + interval < Date.now()) {
      this.prevLogging += interval;
      console.log(`[${this.name}] FPS: ${this.fpsValue}`);
    }
  }
}

export {FpsCounter};