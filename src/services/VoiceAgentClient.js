export class VoiceAgentClient {
    constructor(hostname, port, token) {
        this.hostname = hostname;
        this.port = port; 
        this.token = token;
        this.socket = null;
        this.closeReason = null;
        this.status = 'disconnected';
        this.onStatus = null;
        this.onError = null;
        this.onMessage = null;
    }
  
    connect = async (
      agent_name,
      agent_config = null,
      stream_user_stt = true, 
      stream_output_audio = true,
      init_greeting = true
    ) => {
      return new Promise((resolve, reject) => {
        this.disconnect();

        const wsUrl = `wss://${this.hostname}:${this.port}/ws?token=${encodeURIComponent(this.token)}`;
        this.socket = new WebSocket(wsUrl);
        this.closeReason = null;
  
        this.socket.onopen = () => {
          this._onStatus('connected');
          resolve();

          this._sendJson({
            type: 'init',
            agent_name: agent_name,
            agent_config: agent_config,
            stream_user_stt: stream_user_stt,
            stream_output_audio: stream_output_audio,
            init_greeting: init_greeting
          });
          this._onStatus('activating');
        };
  
        this.socket.onerror = () => {
          this._onError('WebSocket connection error');
          reject();
        };
  
        this.socket.onclose = (event) => {
          this.closeReason = this._getCloseReason(event.code);
          this._onStatus('disconnected');
        };

        this.socket.onmessage = this._socketMessageHandler;

        setTimeout(() => {
          if (!this.isConnected()) {
            reject(new Error('WebSocket connection timed out'));
          }
        }, 5000);
      });
    };
  
    disconnect = () => {
      if (this.isConnected()) {
        this.socket.close(1000, 'Normal closure');
        this.socket = null;
        this.closeReason = 'Normal closure';
        this._onStatus('disconnected');
      }
    };
  
    isConnected = () => this.socket && this.socket.readyState === WebSocket.OPEN;

    sendAudioChunk = (chunk) => {
      this._send(chunk);
    }

    sendTextMessage = (message) => {
      this._sendJson({
          type: 'manual_text',
          content: message
      });
    }
    
    createResponse = () => {
      this._sendJson({
          type: 'create_response'
      });
    }

    cancelResponse = (id, interruptedAt) => {
      this._sendJson({ 
          type: 'interrupt',
          speech_id: id,
          interrupted_at: interruptedAt
      });
    }

    invokeLLM = (model, prompt, messages) => {
      this._sendJson({
          type: 'invoke_llm',
          model: model,
          prompt: prompt,
          messages: messages
      });
    }

    _send = (data) => {
      if (this.isConnected()) {
        try {
          this.socket.send(data);
        } catch (error) {
          this._onError(`Failed to send message: ${error}`);
        }
      } else {
        this._onError('Failed to send message because WebSocket is not connected');
      }
    };
  
    _sendJson = (data) => {
      try {
        this._send(JSON.stringify(data));
      } catch (error) {
        this._onError(`Failed to stringify message: ${error.message}`);
      }
    };

    _socketMessageHandler = async (event) => {
        const arrayBuffer = await event.data.arrayBuffer();
        const dataView = new DataView(arrayBuffer);
        const metadataLength = dataView.getUint32(0);
        const metadata = JSON.parse(new TextDecoder().decode(arrayBuffer.slice(4, 4 + metadataLength)));
        const payload = arrayBuffer.slice(4 + metadataLength);
        if (metadata.type === 'message' || metadata.type === 'audio' || metadata.type === 'llm_response') {
          if (this.onMessage) {
            this.onMessage(metadata, payload);
          }
          console.log(metadata, payload);
        } else if (metadata.type === 'init_done') {
          this._onStatus('ready');
        } else if (metadata.type === 'error') {
          this._onError(`Server error: ${metadata.error}`);
        } else {
          this._onError(`Unknown message type: ${metadata.type}`);
        }
    }

      _onStatus = (status) => {
        if (this.status === status) {
          return;
        }

        this.status = status;
        if (this.onStatus) {
          this.onStatus(status);
        }
      }

      _onError = (error) => {
        if (this.onError) {
          this.onError(error);
        }
      }
  
    _getCloseReason = (code) => {
      const codes = {
        1000: 'Normal closure',
        1001: 'Going away - client/server is disconnecting',
        1002: 'Protocol error',
        1003: 'Unsupported data',
        1004: 'Reserved',
        1005: 'No status received',
        1006: 'Abnormal closure - connection dropped',
        1007: 'Invalid frame payload data',
        1008: 'Policy violation',
        1009: 'Message too big',
        1010: 'Mandatory extension missing',
        1011: 'Internal server error',
        1012: 'Service restart',
        1013: 'Try again later',
        1014: 'Bad gateway',
        1015: 'TLS handshake failure'
      };
      return codes[code] || `Unknown code: ${code}`;
    };
  }
  