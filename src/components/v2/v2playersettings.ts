import { KeyAssignmentPresets } from "./v2consts";

type FunctionKeys = "ctrl" | "shift" | "alt";

type CombinedKeys = {
  key: string;
  func: FunctionKeys[];
};

type ControlIds = 
  "moveLeft" | 
  "moveRight" |
  "softDrop" |
  "hardDrop" |
  "rotateCCW" |
  "rotateCW" |
  "rotate180" |
  "hold" |
  "pause" |
  "retry" |
  "exit";

type Handlings = {
  autoRepeatRate_Frame: number;
  delayedAutoShift_Frame: number;
  dasCancelDelay_Frame: number;
  softDropFactor_Multiplier: number;
  delayedSoftDrop_Frame: number;
  doLockHardDrop: boolean;
}

type KeyAssignments = { [key in ControlIds]: CombinedKeys[] };

class PlayerSettings {
  static readonly version: number = 1;

  keyAssignments: KeyAssignments = KeyAssignmentPresets.defaults;
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

export {PlayerSettings};
export type {CombinedKeys, KeyAssignments, ControlIds}