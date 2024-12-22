<template>
  <div id="conversation-log" ref="conversationLog">
    <div v-if="agentState === 'unselected'" class="status-message">
      Agent not activated
    </div>
    <div v-else-if="agentState === 'initializing'" class="status-message">
      Agent initialization...
    </div>
    <div v-for="message in messages" :key="message.messageId">
      <div :class="['message-meta', message.role]">
        {{ message.timestamp }} • {{ message.role }}
      </div>
      <div :class="['message-bubble', message.role, isAudioMessage(message.content) ? 'audio-message' : '']">
        <audio v-if="isAudioMessage(message.content)" controls>
          <source :src="message.content" type="audio/wav">
        </audio>
        <span v-else class="content">{{ message.content }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    messages: Array,
    agentState: {
      type: String,
      validator: (value) => ['unselected', 'initializing', 'ready'].includes(value),
      default: 'unselected'
    }
  },
  methods: {
    isAudioMessage(content) {
      return content.startsWith('blob:') || content.startsWith('http');
    },
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
  margin-bottom: 16px;
  padding: 10px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 70%;
  width: fit-content;
}

.timestamp {
  font-weight: bold;
  color: #6c757d;
}

.content {
  white-space: pre-wrap;
  color: #212529;
}

.status-message {
  font-style: italic;
  text-align: center;
  color: #6c757d;
  padding: 20px;
}

.message-bubble.assistant {
  background-color: #ffffff;
  margin-right: auto;
}

.message-bubble.user {
  background-color: #e8f5e9;
  margin-left: auto;
}

.message-bubble.audio-message {
  background-color: transparent;
  box-shadow: none;
}

.message-meta {
  font-size: 0.8em;
  color: #6c757d;
  margin-bottom: 4px;
  padding: 0 10px;
  text-align: left;
}

.message-meta.user {
  text-align: right;
}
</style>
