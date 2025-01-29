<template>
    <div class="custom-prompt">
      <div class="input-row">
        <textarea v-model="prompt" placeholder="Ask a question about the current dialog, e.g. 'Is conversation respectful?'"></textarea>
      </div>
      
      <div class="input-row">
        <select v-model="selectedModel">
          <option v-for="model in Object.keys(models)" :key="model" :value="model">
            {{ model }}
          </option>
        </select>
      </div>
      
      <button @click="sendPrompt">Send</button>
      
      <div class="input-row">
        <textarea :value="llmResponse" readonly placeholder="Response will appear here..."></textarea>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'CustomPrompt',

    props: {
      llmResponse: {
        type: String,
        required: true
      }
    },
    
    data() {
      return {
        prompt: '',
        selectedModel: 'GPT-4o-mini',
        models: {
          'GPT-4o-mini': 'gpt-4o-mini',
          'Gemini 1.5 Flash': 'gemini-1.5-flash',
          'Llama 3.3 70B': 'meta-llama-3.3-70b-instruct-turbo'
        }
      };
    },
  
    methods: {
      sendPrompt() {
        this.$emit('send-prompt', {
          prompt: this.prompt,
          model: this.models[this.selectedModel]
        });
      }
    }
  };
  </script>
  
  <style scoped>
  .custom-prompt {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .input-row {
    width: 100%;
    display: flex;
  }

  select, textarea {
    width: 100%;
    border: 2px solid #e1e1e1;
    border-radius: 12px;
    font-size: 14px;
    background-color: #f8f9fa;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #3498db;
      background-color: #fff;
    }
  }

  select {
    padding: 8px;
    cursor: pointer;
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
    
    &:hover {
      background-color: #2980b9;
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
    }
  }

  textarea {
    min-height: 80px;
    padding: 12px;
    resize: vertical;
    margin-bottom: 8px;
    
    &[readonly] {
      background-color: #f1f3f5;
      cursor: default;
    }
  }
  </style>