import * as PIXI from "pixi.js";
import { Howl, type HowlOptions } from "howler";

class AssetsLoader {
  texturesLoadQueue: Map<string, string> = new Map();
  textures: Map<string, PIXI.Texture> = new Map();

  audiosLoadQueue: Map<string, HowlOptions> = new Map();
  audios: Map<string, Howl> = new Map();
  
  readonly baseURL: string = import.meta.env.BASE_URL;

  addTexturePaths(paths: Map<string, string>) {
    this.texturesLoadQueue = new Map([...this.texturesLoadQueue, ...paths]);
  }

  async loadTextures({callback, progress}: {callback: () => void, progress: (percentage: number, next: string) => void}) {
    let cnt = 0;
    for (let [name, path] of this.texturesLoadQueue) {
      progress(cnt / this.texturesLoadQueue.size * 100, name);
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

  addAudioPaths(paths: Map<string, HowlOptions>) {
    this.audiosLoadQueue = new Map([...this.audiosLoadQueue, ...paths]);
  }

  loadAudios() {
    for (let [name, options] of this.audiosLoadQueue) {
      if (options.src instanceof Array)
        options.src = options.src.map(path => `${this.baseURL}${path}`);
      else
        options.src = `${this.baseURL}${options.src}`

      this.audios.set(name, new Howl(options));
    }
  }

  getAllAudios() {
    return this.audios;
  }
}

export {AssetsLoader};