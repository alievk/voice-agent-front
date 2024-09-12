<template>
    <div id="conversation-log" ref="conversationLog">
      <p v-for="(message, index) in messages" :key="index">
        [{{ message.timestamp }}] {{ message.role }}: {{ message.text }}
      </p>
    </div>
</template>

<script>
export default {
  props: ['messages'],
  methods: {
    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.conversationLog) {
          this.$refs.conversationLog.scrollTop = this.$refs.conversationLog.scrollHeight;
        }
      });
    }
  },
  watch: {
    messages: {
      handler() {
        this.scrollToBottom();
      },
      deep: true
    }
  }
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
