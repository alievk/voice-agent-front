export class VoiceAgentClient {
    socket = null;
    onConnectionEstablished = null;
    onAudioMessage = null;
    onJsonMessage = null;
    eventHandlers = new Map();
  
    connect = async (hostname, port) => {
      if (this.isConnected()) return;
  
      return new Promise((resolve, reject) => {
        const wsUrl = `wss://${hostname}:${port}`;
        this.socket = new WebSocket(wsUrl);
  
        this.socket.onopen = () => {
          this.onConnectionEstablished?.();
          resolve();
        };
  
        this.socket.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          this.emit('error', 'Connection error');
          reject(error);
        };
  
        this.socket.onclose = (event) => {
          const reason = this.getCloseReason(event.code);
          console.log(`WebSocket closed: ${reason}`);
          this.emit('disconnected', `Connection closed: ${reason}`);
        };
  
        setTimeout(() => {
          if (!this.isConnected()) {
            reject(new Error('WebSocket connection timed out'));
          }
        }, 5000);
  
        this.socket.onmessage = this.onMessage;
      });
    };
  
    disconnect = () => {
      if (this.socket) {
        this.socket.close(1000, "Normal closure");
        this.socket = null;
        this.emit('disconnected');
      }
    };
  
    isConnected = () => this.socket && this.socket.readyState === WebSocket.OPEN;
  
    _send = (data) => {
      if (this.isConnected()) {
        try {
          this.socket.send(data);
        } catch (error) {
          console.error('Failed to send message:', error);
          this.emit('error', 'Failed to send message');
        }
      } else {
        console.warn('Failed to send message because WebSocket is not connected');
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
        console.error('Failed to stringify message:', error);
        this.emit('error', 'Failed to format message');
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

    onMessage = async (event) => {
        const arrayBuffer = await event.data.arrayBuffer();
        const dataView = new DataView(arrayBuffer);
        const metadataLength = dataView.getUint32(0);
        const metadata = JSON.parse(new TextDecoder().decode(arrayBuffer.slice(4, 4 + metadataLength)));
        const payload = arrayBuffer.slice(4 + metadataLength);
        this.emit('conversation.updated', { metadata, payload });
    }
  
    getCloseReason = (code) => {
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
  