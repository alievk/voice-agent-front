export class VoiceAgentClient {
    socket = null;
    eventHandlers = new Map();
  
    connect = async (hostname, port, token) => {
      if (this.isConnected()) return;
  
      return new Promise((resolve, reject) => {
        const wsUrl = `wss://${hostname}:${port}/ws?token=${encodeURIComponent(token)}`;
        this.socket = new WebSocket(wsUrl);
  
        this.socket.onopen = () => {
          this.emit('connected');
          resolve();
        };
  
        this.socket.onerror = () => {
          this.emit('error', 'WebSocket connection error');
          reject();
        };
  
        this.socket.onclose = (event) => {
          const reason = this._getCloseReason(event.code);
          this.emit('disconnected', reason);
        };

        this.socket.onmessage = this._onMessage;

        setTimeout(() => {
          if (!this.isConnected()) {
            reject(new Error('WebSocket connection timed out'));
          }
        }, 5000);
      });
    };
  
    disconnect = () => {
      if (this.socket) {
        this.socket.close(1000, "Normal closure");
        this.socket = null;
      }
    };
  
    isConnected = () => this.socket && this.socket.readyState === WebSocket.OPEN;
  
    _send = (data) => {
      if (this.isConnected()) {
        try {
          this.socket.send(data);
        } catch (error) {
          this.emit('error', `Failed to send message: ${error}`);
        }
      } else {
        this.emit('error', 'Failed to send message because WebSocket is not connected');
      }
    };

    sendAudioChunk = (chunk) => {
        this._send(chunk);
    }
  
    _sendJson = (data) => {
      try {
        this._send(JSON.stringify(data));
      } catch (error) {
        this.emit('error', `Failed to stringify message: ${error.message}`);
      }
    };

    activateAgent = (agentName) => {
        this._sendJson({
            type: 'init',
            agent_name: agentName
        });
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
  
    on(eventName, handler) {
        this.eventHandlers.set(eventName, handler);
    }

    emit(eventName, data) {
        const handler = this.eventHandlers.get(eventName);
        if (handler) {
            handler(data);
        }
    }

    _onMessage = async (event) => {
        const arrayBuffer = await event.data.arrayBuffer();
        const dataView = new DataView(arrayBuffer);
        const metadataLength = dataView.getUint32(0);
        const metadata = JSON.parse(new TextDecoder().decode(arrayBuffer.slice(4, 4 + metadataLength)));
        const payload = arrayBuffer.slice(4 + metadataLength);
        if (metadata.type === 'message' || metadata.type === 'audio') {
          this.emit('conversation.updated', { metadata, payload });
        } else if (metadata.type === 'init_done') {
          this.emit('conversation.started');
        } else if (metadata.type === 'error') {
          this.emit('error', metadata.error);
        } else {
          this.emit('error', `Unknown message type: ${metadata.type}`);
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
  