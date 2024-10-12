<template>
  <div class="container">
    <Sidebar :actions="actions" />
    <div class="main">
      <ConversationLog :messages="messages" />
      <AudioStreamer @transcription-received="updateTranscription" @new-conversation="clearMessages"/>
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
      const { speech_id, confirmed_text, unconfirmed_text } = data;
      const timestamp = new Date().toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        // day: '2-digit',
        // month: '2-digit',
        // year: 'numeric'
      });

      const existingMessage = this.messages.find(m => m.speechId === speech_id);
      if (existingMessage) {
        existingMessage.confirmedText = confirmed_text;
        existingMessage.unconfirmedText = unconfirmed_text;
      } else {
        this.messages.push({
          timestamp,
          role: 'User',
          speechId: speech_id,
          confirmedText: confirmed_text,
          unconfirmedText: unconfirmed_text
        });
      }
    },

    addAction(action) {
      this.actions.push(action);
    },

    clearMessages() {
      this.messages = [];
    }
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