class FpsCounter {
  fpsMeasureBegin: number = Date.now();
  fpsCount: number = 0;
  fpsValue: number = 0;
  prevLogging: number = Date.now() - 1000;

  get(): number {
    if (Date.now() - this.fpsMeasureBegin >= 1000) {
      this.fpsValue = this.fpsCount;
      this.fpsCount = 0;
      this.fpsMeasureBegin += 1000;
    }
    this.fpsCount++;
    return this.fpsValue;
  }

  log() {
    this.get();
    if (this.prevLogging + 1000 < Date.now()) {
      this.prevLogging += 1000;
      console.log("FPS: ", this.fpsValue);
    }
  }
}

export {FpsCounter};