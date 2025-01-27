<template>
  <div class="app-container">
    <div class="main-content">
      <ConversationLog 
        :messages="messages" 
        :agentState="agentState"
      />
      
      <MessageInput 
        :isRecordingUserAudio="isRecordingUserAudio"
        :inputMode="inputMode"
        :buttonsEnabled="agentState === 'ready'"
        @start-recording="startRecordingUserAudio"
        @stop-recording="stopRecordingUserAudio"
        @send-text="sendTextMessage"
        @input-mode-change="mode => inputMode = mode"
        @system-message="addSystemMessage"
        @clean-messages="cleanMessages"
      />
    </div>

    <Sidebar 
      @activate-agent="handleActivateAgent"
      @send-prompt="handleSendPrompt"
      :systemMessages="systemMessages"
      :agents="agents"
      :llmResponse="llmResponse"
    />
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue'
import ConversationLog from './components/ConversationLog.vue'
import MessageInput from './components/MessageInput.vue'
import { VoiceAgentClient } from './services/VoiceAgentClient.js'
import { WavStreamPlayer } from '/src/lib/wavtools/index.js';
import { WavRecorder } from '/src/lib/wavtools/index.js';

export default {
  components: {
    Sidebar,
    ConversationLog,
    MessageInput
  },

  data() {
    return {
      messages: [],
      systemMessages: [],
      llmResponse: '',
      selectedAgent: '',
      client: new VoiceAgentClient(
        process.env.VUE_APP_WS_HOST || "localhost",
        process.env.VUE_APP_WS_PORT || 8564,
        process.env.VUE_APP_WS_TOKEN || ""
      ),
      agentState: 'unselected',
      audioStreamPlayer: new WavStreamPlayer({ sampleRate: 24000 }),
      audioRecorder: new WavRecorder({ sampleRate: 16000 }),
      isRecordingUserAudio: false,
      inputMode: 'audio',
      agents: [],
    }
  },

  mounted() {
    this.agents = this.fetchAgents();
    this.setupEventListeners();
  },

  methods: {
    setupEventListeners() {
      this.client.on('connected', () => {
        this.addSystemMessage('Client connected to server')
      });

      this.client.on('disconnected', (reason) => {
        this.addSystemMessage(`Client disconnected from server: ${reason}`)
      });

      this.client.on('error', (event) => {
        this.addSystemMessage(`Client error: ${event}`)
      });

      this.client.on('conversation.started', () => {
        this.addSystemMessage('Conversation started')
        this.agentState = 'ready'
      });

      this.client.on('conversation.updated', ({ metadata, payload }) => {
        if (metadata.type === 'audio') {
          this.audioStreamPlayer.add16BitPCM(payload, metadata.speech_id);
        } else if (metadata.type === 'message') {
          this.updateMessages({
            role: metadata.role,
            content: metadata.content,
            timestamp: metadata.time,
            messageId: metadata.id
          });
        }
      });

      this.client.on('llm.response', ({ response }) => {
        this.llmResponse = response.content;
      });
    },

    updateMessages(data) {
      const { role, content, timestamp, messageId } = data;

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

    addSystemMessage(message) {
      this.systemMessages.push({
        id: Date.now(),
        content: message,
        timestamp: Date.now()
      });
    },

    handleActivateAgent(agentName) {
      this.selectedAgent = agentName;
      this.disconnect();
      this.cleanMessages();
      this.agentState = 'initializing';
      this.connect();
    },

    async connect() {
      try {
        this.audioStreamPlayer.connect();
        await this.client.connect(this.selectedAgent);
      } catch (error) {
        this.addSystemMessage(`Connection failed: ${error}`);
      }
    },

    disconnect() {
      this.audioStreamPlayer.interrupt();
      this.client.disconnect();
      this.agentState = 'unselected';
    },

    async startRecordingUserAudio() {
      if (this.isRecordingUserAudio) return;
      try {
        await this.sendUserInterrupt();

        await this.audioRecorder.begin();
        await this.audioRecorder.record(
          (data) => {
            this.client.sendAudioChunk(data.mono);
          }
        );

        if (this.audioRecorder.getStatus() === 'recording') {
          this.isRecordingUserAudio = true;
          this.addSystemMessage('Started recording user audio');
        }
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    },

    async stopRecordingUserAudio() {
      if (!this.isRecordingUserAudio) return;
      const userAudio = await this.audioRecorder.end();
      this.client.createResponse();
      this.isRecordingUserAudio = false;
      this.addAudioMessage(userAudio, 'user');
      this.addSystemMessage('Stopped recording user audio');
    },

    addAudioMessage(audio, role) {
      const lastUserMessage = this.messages.findLast(m => m.role === role);
      if (!lastUserMessage) return;
      const messageId = lastUserMessage.messageId + (role === 'assistant' ? 1000 : 2000);
      this.updateMessages({
        role: role,
        content: audio.url,
        timestamp: lastUserMessage.timestamp,
        messageId: messageId
      });
    },

    sendTextMessage(message) {
      const textMessage = message.trim();
      if (!textMessage) return;
      this.client.sendTextMessage(textMessage);
      this.$emit('system-message', `Sent text message: ${textMessage}`);
    },

    async sendUserInterrupt() {
      const trackOffet = await this.audioStreamPlayer.interrupt();
      if (!trackOffet) return;
      this.client.cancelResponse(trackOffet.trackId, trackOffet.currentTime);
    },

    handleSendPrompt(data) {
      if (!this.client.isConnected()) {
        this.addSystemMessage('Cannot send prompt, client is not connected');
        return;
      }

      const conversation = this.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      this.client.invokeLLM(
        data.model,
        data.prompt,
        [{'role': 'user', 'content': conversation}]
      );
    },

    fetchAgents() {
      // Simulated API call
      return [
        { name: 'STT Test', description: 'A test agent to test the STT.' },
        { name: 'Best friend', description: 'A best friend agent.' },
        { name: 'Meeting at the bar', description: 'You meet a girl at the bar and she invites you to her place.' },
        { name: 'Lovely Wife', description: 'A romantic and affectionate agent.' },
      ];
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
