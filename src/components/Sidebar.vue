<template>
  <div class="app-sidebar">
    <div class="sidebar-content">
      <p>Agent:</p>
      <select v-model="selectedAgentKey" @change="updateDescription">
        <option v-for="(agent, key) in agents" :key="key" :value="key">
          {{ agent.title }}
        </option>
      </select>
      <p>{{ agentDescription }}</p>
      <button @click="activateAgent">Activate Agent</button>
      
      <hr class="delimiter" />
      
      <p>Custom prompt:</p>
      <CustomPrompt @send-prompt="handleSendPrompt" :llmResponse="llmResponse" />

      <hr class="delimiter" />

      <p>Server metrics:</p>
      <div class="metrics">
        <p>Active Connections: {{ metrics.active_connections }}</p>
      </div>

      <hr class="delimiter" />

      <p>System output:</p>
      <SystemOutput :systemMessages="systemMessages" />
    </div>
  </div>
</template>

<script>
import SystemOutput from './SystemOutput.vue'
import CustomPrompt from './CustomPrompt.vue'

export default {
  name: 'AppSidebar',
  
  components: {
    SystemOutput,
    CustomPrompt
  },

  props: {
    systemMessages: {
      type: Array,
      required: true
    },
    agents: {
      type: Object,
      required: true
    },
    llmResponse: {
      type: String,
      required: true
    },
    client: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      selectedAgentKey: '',
      agentDescription: '',
      metrics: {
        active_connections: 0
      }
    };
  },

  created() {
    this.updateMetrics();
    setInterval(this.updateMetrics, 5000);
  },

  watch: {
    agents: {
      handler(newAgents) {
        if (newAgents && Object.keys(newAgents).length > 0) {
          const firstAgentKey = Object.keys(newAgents)[0];
          this.selectedAgentKey = firstAgentKey;
          this.agentDescription = newAgents[firstAgentKey].description;
        }
      },
      immediate: true
    }
  },

  methods: {
    async updateMetrics() {
      this.metrics = await this.client.getMetrics();
    },

    updateDescription() {
      this.agentDescription = this.agents[this.selectedAgentKey].description;
    },

    activateAgent() {
      this.$emit('activate-agent', this.selectedAgentKey);
    },

    handleSendPrompt(data) {
      this.$emit('send-prompt', data);
    }
  },
};
</script>

<style scoped>
.app-sidebar {
  width: 30%;
  min-width: 300px;
  max-width: 500px;
  background-color: #ffffff;
  padding: 30px;
  border-left: 1px solid #e9ecef;
  max-height: 100vh;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  font-family: 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

h4 {
  font-size: 20px;
  color: #333;
  margin: 0 0 12px 0;
  text-align: center;
}

select {
  width: 100%;
  padding: 8px;
  border: 2px solid #e1e1e1;
  border-radius: 12px;
  font-size: 16px;
  background-color: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
}

select:hover {
  border-color: #3498db;
  background-color: #fff;
}

p {
  font-size: 16px;
  line-height: 1.5;
  color: #666;
  margin: 0;
  padding: 0 10px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 25px;
  background-color: #3498db;
  color: white;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  align-self: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

button:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

button:active {
  transform: translateY(0);
}

.delimiter {
  width: 100%;
  border: none;
  border-top: 2px solid #e1e1e1;
  margin: 8px 0;
}

.metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e1e1e1;
  border-radius: 12px;
}
</style>