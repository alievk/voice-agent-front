<template>
    <div id="conversation-log">
      <p v-for="(message, index) in messages" :key="index">
        [{{ message.timestamp }}] {{ message.role }}: {{ message.text }}
      </p>
    </div>
</template>

<script>
export default {
  props: ['messages']
}
</script>

<style scoped>
#conversation-log {
    flex: 1;
    width: 100%;
    max-height: 70vh;
    overflow-y: auto;
    margin-bottom: 20px;
    border: 1px solid #ddd;
    padding: 10px;
    border-radius: 5px;
}
</style>
