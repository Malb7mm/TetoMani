<script setup lang="ts">
</script>

<template>
  <div id="tetgame"></div>
  <div id="debugref" v-if="false">
  </div>
</template>

<style scoped>
#tetgame {
  user-select: none;
  min-height: 90vh;
  min-width: 100vh;
}

#debugref {
  font-family: 'M PLUS 1';
  font-weight: 400;

  right: 0;
}
</style>