<template>
  <div id="conversation-log" ref="conversationLog">
    <div v-if="isWarmingUp" class="warming-up-message">Warming up the models...</div>
    <div 
      v-for="message in messages" 
      :key="message.messageId" 
      :class="['message-bubble', message.role]"
    >
      <span class="timestamp">[{{ message.timestamp }}] {{ message.role }}: </span>
      <span class="content">{{ message.content }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: ['messages', 'isWarmingUp'],
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
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
  padding: 15px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.message-bubble {
  margin-bottom: 12px;
  padding: 10px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.timestamp {
  font-weight: bold;
  color: #6c757d;
}

.content {
  white-space: pre-wrap;
  color: #212529;
}

.warming-up-message {
  font-style: italic;
  text-align: center;
  color: #6c757d;
  padding: 20px;
}

.message-bubble.assistant {
  background-color: #ffffff;
}

.message-bubble.user {
  background-color: #e8f5e9;
}
</style>
