<template>
    <div class="AppSidebar">
      <h3>Conversation</h3>
      <ul>
        <li v-for="(action, index) in actions" :key="index">{{ action }}</li>
      </ul>
    </div>
  </template>
  
  <script>
  export default {
    name: 'AppSidebar', // Renamed to a multi-word name
    props: ['actions']
  }
  </script>
  
  <style scoped>
  .sidebar {
    width: 20%;
    background-color: #f4f4f4;
    padding: 10px;
    border-right: 1px solid #ddd;
    overflow-y: auto;
  }
  </style>
