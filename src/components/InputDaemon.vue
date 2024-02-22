<script setup lang="ts">
import { useActionStateStore } from '../stores/stores'

const actionState = useActionStateStore();

let keyconfs: { [key: string]: Set<string> } = {
  "left": new Set(["KeyA"]),
  "right": new Set(["KeyD"]),
  "softdrop": new Set(["KeyS"]),
  "harddrop": new Set(["KeyW"]),
  "rotatecw": new Set(["KeyL", "ArrowRight"]),
  "rotateccw": new Set(["KeyK", "ArrowLeft"]),
  "hold": new Set(["ShiftLeft"]),
}

let keyState: { [keyCode: string]: boolean } = {};
for (let key in keyconfs) {
  for (let keyCode of keyconfs[key]) {
    keyState[keyCode] = false;
  }
  actionState.value[key] = false;
}

document.addEventListener("keydown", (e) => {
  for (let key in keyconfs) {
    let doActivate = false;
    for (let keyCode of keyconfs[key]) {
      if (e.code == keyCode) {
        keyState[keyCode] = true;
        doActivate = true;
      }
    }
    if (doActivate) {
      actionState.value[key] = true;
    }
  }
});

document.addEventListener("keyup", (e) => {
  for (let key in keyconfs) {
    let doInactivate = true;
    for (let keyCode of keyconfs[key]) {
      if (e.code == keyCode) {
        keyState[keyCode] = false;
      }
      if (keyState[keyCode] == true) {
        doInactivate = false;
      }
    }
    if (doInactivate) {
      actionState.value[key] = false;
    }
  }
});
</script>

<template></template>