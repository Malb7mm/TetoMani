import * as PIXI from "pixi.js";

class AssetsLoader {
  queue: Map<string, string> = new Map();
  textures: Map<string, PIXI.Texture> = new Map();
  baseURL: string = import.meta.env.BASE_URL + "/";

  addTexturePaths(paths: Map<string, string>) {
    this.queue = new Map([...this.queue, ...paths]);
  }

  async loadTextures({callback, progress}: {callback: () => void, progress: (percentage: number, next: string) => void}) {
    let cnt = 0;
    for (let [name, path] of this.queue) {
      progress(cnt / this.queue.size * 100, name);
      this.textures.set(name, await PIXI.Assets.load(`${this.baseURL}${path}`));
      cnt++;
    }
    progress(100, "");
    callback();
  }

  getTexture(name: string): PIXI.Texture {
    let result = this.textures.get(name);
    if (result === undefined)
      throw new Error(`The texture ${name} hasn't been loaded`);
    return result;
  }
}

export {AssetsLoader};