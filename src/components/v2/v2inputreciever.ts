import { KeyAssignmentPresets } from "./v2consts";
import type { KeyAssignments, ControlIds } from "./v2playersettings";

class InputReciever {
  activeControls: Set<ControlIds> = new Set();
  keyAssignments: KeyAssignments = KeyAssignmentPresets.defaults;

  constructor() {
    document.addEventListener("keydown", e => {
      this.activeControls.add(e.code as ControlIds);
    });
    document.addEventListener("keyup", e => {
      this.activeControls.delete(e.code as ControlIds);
    });
  }

  getAllActive(): Set<ControlIds> {
    return this.activeControls;
  }
}

export {InputReciever};