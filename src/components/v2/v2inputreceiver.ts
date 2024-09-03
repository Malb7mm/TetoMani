import { KeyAssignmentPresets } from "./v2consts";
import type { KeyAssignments, ControlId, FunctionKey, CombinedKeys } from "./v2playersettings";

class InputReceiver {
  activeControls: Set<ControlId> = new Set();
  keyAssignsReverseLookup: Map<CombinedKeys, ControlId> = new Map();

  constructor() {
    this.updateAssignments(KeyAssignmentPresets.defaults);

    document.addEventListener("keydown", e => {
      let control = this.getAssignedControl(e);
      if (control !== undefined)
        this.activeControls.add(control);
    });
    document.addEventListener("keyup", e => {
      for (let control of this.getAssignedControlWithoutFunc(e))
        this.activeControls.delete(control);
    });
  }

  updateAssignments(keyAssignments: KeyAssignments) {
    let entries = [...keyAssignments.entries()];
    let array: [CombinedKeys, string][] = [];
    for (let entry of entries) {
      for (let comb of entry[1]) {
        array.push([comb, entry[0]]);
      }
    }
    this.keyAssignsReverseLookup = new Map(array.sort((a, b) => {
      return getOrderValue(b[0].func) - getOrderValue(a[0].func);
    }));

    function getOrderValue(funcs: FunctionKey[]): number {
      let values: { [key: string]: number } = {"alt": 4, "ctrl": 2, "shift": 1};
      let result = 0;
      for (let func of funcs)
        result += values[func];
      return result;
    }
  }

  private getAssignedControl(e: KeyboardEvent): ControlId | undefined {
    for (let [comb, ctrlId] of this.keyAssignsReverseLookup) {
      if (comb.key !== e.code) continue;
      if (comb.func.includes("shift") && !e.shiftKey) continue;
      if (comb.func.includes("ctrl") && !e.ctrlKey) continue;
      if (comb.func.includes("alt") && !e.altKey) continue;
      return ctrlId;
    }
    return undefined;
  }

  private getAssignedControlWithoutFunc(e: KeyboardEvent): ControlId[] {
    let result: ControlId[] = [];
    for (let [comb, ctrlId] of this.keyAssignsReverseLookup) {
      if (comb.key !== e.code) continue;
      result.push(ctrlId);
    }
    return result;
  }

  getAllActive(): Set<ControlId> {
    return this.activeControls;
  }

  isActive(ctrlId: ControlId) {
    return this.activeControls.has(ctrlId);
  }
}

export {InputReceiver};