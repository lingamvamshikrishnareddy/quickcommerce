import { io } from 'socket.io-client';
import logger from '../utils/logger';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
  }

  initialize(options = {}) {
    const defaultOptions = {
      url: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
      opts: {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: this.maxConnectionAttempts,
        reconnectionDelay: 1000, // 1 second
        reconnectionDelayMax: 5000, // 5 seconds
        randomizationFactor: 0.5,
        timeout: 10000, // 10 seconds connection timeout
        transports: ['websocket', 'polling'],
        forceNew: true, // Create a new connection each time
      }
    };

    // Merge default options with provided options
    const mergedOptions = {
      ...defaultOptions,
      url: options.url || defaultOptions.url,
      opts: { ...defaultOptions.opts, ...options.opts }
    };

    try {
      this.socket = io(mergedOptions.url, mergedOptions.opts);

      // Connection event handlers
      this.socket.on('connect', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        logger.info('Connected to WebSocket Server');
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        logger.warn(`Disconnected from WebSocket: ${reason}`);
      });

      this.socket.on('connect_error', (error) => {
        this.connectionAttempts++;
        logger.error(`WebSocket Connection Error (Attempt ${this.connectionAttempts}):`, error);

        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          logger.error('Max connection attempts reached. Stopping reconnection.');
          this.socket.disconnect();
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        logger.info(`WebSocket Reconnected after ${attemptNumber} attempts`);
      });

      this.socket.on('reconnect_error', (error) => {
        logger.error('WebSocket Reconnection Error:', error);
      });

      return this;
    } catch (error) {
      logger.error('Failed to initialize WebSocket:', error);
      throw error;
    }
  }

  // Connect to the socket
  connect() {
    if (!this.socket) {
      throw new Error('Socket not initialized. Call initialize() first.');
    }
    this.socket.connect();
    return this;
  }

  // Disconnect from the socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    return this;
  }

  // Get current socket instance
  getInstance() {
    if (!this.socket) {
      throw new Error('Socket not initialized.');
    }
    return this.socket;
  }

  // Add a method to listen to specific events
  on(eventName, callback) {
    if (!this.socket) {
      throw new Error('Socket not initialized.');
    }
    this.socket.on(eventName, callback);
    return this;
  }

  // Method to emit events
  emit(eventName, data) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected.');
    }
    this.socket.emit(eventName, data);
    return this;
  }
}

// Create a singleton instance
const socketManager = new SocketManager();

export default socketManager;