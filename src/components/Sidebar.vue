<template>
  <div class="app-sidebar">
    <h3>Conversation</h3>
    <ul>
      <li v-for="(action, index) in actions" :key="index">{{ action }}</li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'AppSidebar',
  props: ['actions']
}
</script>

<style scoped>
.app-sidebar {
  width: 250px;
  background-color: #f8f9fa;
  padding: 20px;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  height: 100vh;
}

h3 {
  font-size: 1.2rem;
  color: #343a40;
  margin-bottom: 15px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
}

li:last-child {
  border-bottom: none;
}
</style>
