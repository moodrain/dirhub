<template>
  <div id="app">
    <explorer></explorer>
  </div>
</template>

<script>
  import Explorer from './components/Explorer'
  export default {
    name: 'dirhub',
    components: {
      Explorer
    }
  }
</script>

<style>
* {
  margin: 0;
  padding: 0;
}
html, body, #app {
  width: 100%;
  height: 100%;
}
.el-drawer__body {
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}
</style>