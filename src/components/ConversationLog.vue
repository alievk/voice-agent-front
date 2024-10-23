<template>
  <div id="conversation-log" ref="conversationLog">
    <div v-if="isWarmingUp" class="warming-up-message">Warming up the models...</div>
    <div v-for="message in messages" :key="message.messageId" class="message-bubble">
      <span class="timestamp">[{{ message.timestamp }}] {{ message.role }}: </span>
      <span class="confirmed-text">{{ message.confirmedText }}</span>
      <span class="unconfirmed-text">{{ message.unconfirmedText }}</span>
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
  max-height: 70vh;
  overflow-y: auto;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 5px;
}

.message-bubble {
  margin-bottom: 10px;
}

.timestamp {
  font-weight: bold;
}

.confirmed-text {
  color: black;
}

.unconfirmed-text {
  color: gray;
}

.warming-up-message {
  font-style: italic;
  text-align: left;
  color: #4a4a4a;
}
</style>
