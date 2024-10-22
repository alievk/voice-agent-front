<template>
  <div class="container">
    <Sidebar :actions="actions" />
    <div class="main">
      <ConversationLog :messages="messages" />
      <AudioStreamer @transcription-received="updateTranscription"/>
    </div>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue'
import ConversationLog from './components/ConversationLog.vue'
import AudioStreamer from './components/AudioStreamer.vue'

export default {
  components: {
    Sidebar,
    ConversationLog,
    AudioStreamer
  },
  data() {
    return {
      messages: [],
      actions: [],
    }
  },
  methods: {
    updateTranscription(data) {
      const { role, confirmedText, timestamp, messageId } = data;

      const existingMessageIndex = this.messages.findIndex(m => m.messageId === messageId);
      if (existingMessageIndex !== -1) {
        this.messages[existingMessageIndex] = { ...this.messages[existingMessageIndex], ...data };
      } else {
        this.messages.push({
          role,
          confirmedText,
          unconfirmedText: '',
          timestamp,
          messageId
        });
      }
    },

    addAction(action) {
      this.actions.push(action);
    },
  },
}
</script>

<style scoped>
.container {
  display: flex;
  height: 100vh;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}
</style>
