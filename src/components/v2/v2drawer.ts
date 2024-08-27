import * as PIXI from "pixi.js";

class Drawer {
  pixiapp: PIXI.Application<HTMLCanvasElement>;

  constructor(container: HTMLElement) {
    this.pixiapp = new PIXI.Application<HTMLCanvasElement>({
      resizeTo: container!,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    container.appendChild(this.pixiapp.view);
  }
}