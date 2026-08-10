class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  createConnection(url, options = {}) {
    if (this.connections.has(url)) {
      return this.connections.get(url);
    }

    const connection = {
      ws: null,
      url,
      options,
      listeners: new Map(),
      isConnected: false,
    };

    this.connect(url, connection);
    this.connections.set(url, connection);
    return connection;
  }

  connect(url, connection) {
    try {
      connection.ws = new WebSocket(url);

      connection.ws.onopen = () => {
        connection.isConnected = true;
        this.reconnectAttempts.set(url, 0);
        this.emit(url, 'connected', { url });
        console.log(`Connected to ${url}`);
      };

      connection.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(url, 'message', data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      connection.ws.onerror = (error) => {
        console.error(`WebSocket error for ${url}:`, error);
        this.emit(url, 'error', error);
      };

      connection.ws.onclose = () => {
        connection.isConnected = false;
        this.emit(url, 'disconnected', { url });
        this.handleReconnect(url, connection);
      };
    } catch (error) {
      console.error(`Failed to create connection to ${url}:`, error);
      this.handleReconnect(url, connection);
    }
  }

  handleReconnect(url, connection) {
    const attempts = this.reconnectAttempts.get(url) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(url, attempts + 1);
      
      setTimeout(() => {
        console.log(`Reconnecting to ${url} (Attempt ${attempts + 1})`);
        this.connect(url, connection);
      }, this.reconnectDelay * Math.pow(2, attempts));
    } else {
      console.error(`Max reconnection attempts reached for ${url}`);
      this.emit(url, 'maxReconnectReached', { url });
    }
  }

  addListener(url, event, callback) {
    const connection = this.connections.get(url);
    if (!connection) return;

    if (!connection.listeners.has(event)) {
      connection.listeners.set(event, []);
    }
    connection.listeners.get(event).push(callback);
  }

  removeListener(url, event, callback) {
    const connection = this.connections.get(url);
    if (!connection) return;

    const listeners = connection.listeners.get(event);
    if (listeners) {
      connection.listeners.set(
        event,
        listeners.filter(cb => cb !== callback)
      );
    }
  }

  emit(url, event, data) {
    const connection = this.connections.get(url);
    if (!connection) return;

    const listeners = connection.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    });
  }

  send(url, data) {
    const connection = this.connections.get(url);
    if (connection && connection.ws && connection.isConnected) {
      connection.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  closeConnection(url) {
    const connection = this.connections.get(url);
    if (connection) {
      connection.ws?.close();
      this.connections.delete(url);
      this.reconnectAttempts.delete(url);
    }
  }

  closeAll() {
    this.connections.forEach((connection, url) => {
      this.closeConnection(url);
    });
  }
}

export const wsManager = new WebSocketManager();
