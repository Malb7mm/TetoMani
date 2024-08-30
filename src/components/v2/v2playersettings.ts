import { KeyAssignmentPresets } from "./v2consts";

const functionKeys = ["shift", "ctrl", "alt"];
type FunctionKey = typeof functionKeys[number];

type CombinedKeys = {
  key: string;
  func: FunctionKey[];
};

const controlIds = [
  "moveLeft", 
  "moveRight", 
  "softDrop", 
  "hardDrop", 
  "rotateCCW", 
  "rotateCW", 
  "rotate180", 
  "hold", 
  "pause", 
  "retry", 
  "exit",
  "undo",
  "redo"];
type ControlId = typeof controlIds[number];

type Handlings = {
  autoRepeatRate_Frame: number;
  delayedAutoShift_Frame: number;
  dasCancelDelay_Frame: number;
  softDropFactor_Multiplier: number;
  delayedSoftDrop_Frame: number;
  doLockHardDrop: boolean;
}

type KeyAssignments = Map<ControlId, CombinedKeys[]>;

class PlayerSettings {
  static readonly version: number = 1;

  keyAssignments: KeyAssignments = KeyAssignmentPresets.malb7mm;
  handlings: Handlings = {
    autoRepeatRate_Frame: 2,
    delayedAutoShift_Frame: 11,
    dasCancelDelay_Frame: 2,
    softDropFactor_Multiplier: 20,
    delayedSoftDrop_Frame: 0,
    doLockHardDrop: true,
  }

  static loadJSON(json: string): PlayerSettings | undefined {
    let obj = JSON.parse(json);
    if (obj.version === PlayerSettings.version)
      return Object.assign(new PlayerSettings(), json);
  }
}

export {PlayerSettings, controlIds, functionKeys};
export type {CombinedKeys, KeyAssignments, ControlId, FunctionKey};