<template>
  <div class="app-container">
    <div class="main-content">
      <ConversationLog :messages="messages" :isWarmingUp="isWarmingUp" />
      
      <AudioStreamer 
        @message-received="updateMessages"
        @connection-established="showWarmingUpMessage"
        @system-message="addSystemMessage"
        @clean-messages="cleanMessages"
        :agentName="selectedAgent"
      />
    </div>
    <Sidebar 
      @activate-agent="handleActivateAgent" 
      :systemMessages="systemMessages" 
    />
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
      isWarmingUp: false,
      systemMessages: [],
      selectedAgent: ''
    }
  },
  methods: {
    updateMessages(data) {
      const { role, content, timestamp, messageId } = data;

      if (this.isWarmingUp) {
        this.isWarmingUp = false;
      }

      const existingMessageIndex = this.messages.findIndex(m => m.messageId === messageId);
      if (existingMessageIndex !== -1) {
        this.messages[existingMessageIndex] = { ...this.messages[existingMessageIndex], ...data };
      } else {
        this.messages.push({
          role,
          content,
          timestamp,
          messageId
        });
      }
    },

    cleanMessages() {
      this.messages = [];
    },

    addAction(action) {
      this.actions.push(action);
    },

    showWarmingUpMessage() {
      this.isWarmingUp = true;
    },

    addSystemMessage(message) {
      this.systemMessages.push({
        id: Date.now(),
        content: message,
        timestamp: Date.now()
      });
    },

    handleActivateAgent(agentName) {
      this.selectedAgent = agentName;
    }
  },
}
</script>

<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
}

.app-container {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #ffffff;
}
</style>
