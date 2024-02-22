import { ref, type Ref } from 'vue';
import { defineStore } from 'pinia';

export const useActionStateStore = defineStore("actionState", () => {
  const value: Ref<{ [key: string]: boolean }> = ref({});
  return { value }
});

export const useEndlessGameVariablesStore = defineStore("endlessGameVariables", () => {
  const json = ref("");
  return { json }
});