import type {
  ConnectionState,
  WebSocketOptions,
  WebSocketMessage,
  EventType,
  EventCallback,
} from './websocket-types';

const DEFAULT_OPTIONS: Required<WebSocketOptions> = {
  reconnect: true,
  reconnectInterval: 1000,
  reconnectDecay: 2,
  maxReconnectAttempts: 10,
  maxReconnectInterval: 30000,
  timeout: 5000,
};

/**
 * A robust WebSocket client with automatic reconnection, message queuing, and heartbeat monitoring.
 *
 * @example
 * ```typescript
 * const client = new WebSocketClient('ws://localhost:3000/ws');
 *
 * client.on('open', () => console.log('Connected'));
 * client.on('message', (msg) => console.log('Received:', msg));
 *
 * await client.connect();
 * client.send({ type: 'user_message', data: 'Hello', timestamp: Date.now() });
 * ```
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private eventListeners: Map<EventType, Set<EventCallback>> = new Map();
  private connectionTimeout: number | null = null;
  private connectedAt: number | null = null;
  private shouldReconnect = true;
  private heartbeatInterval: number | null = null;
  private heartbeatTimeout: number | null = null;
  private lastPongReceived: number | null = null;

  /**
   * Creates a new WebSocket client instance.
   *
   * @param url - WebSocket server URL (e.g., 'ws://localhost:3000/ws' or '/ws')
   * @param options - Optional configuration options
   * @throws {Error} If WebSocket is not supported in the browser
   */
  constructor(url: string, options?: WebSocketOptions) {
    if (!this.isWebSocketSupported()) {
      throw new Error('WebSocket is not supported in this browser');
    }

    this.url = this.normalizeUrl(url);
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.eventListeners.set('open', new Set());
    this.eventListeners.set('close', new Set());
    this.eventListeners.set('error', new Set());
    this.eventListeners.set('message', new Set());
    this.eventListeners.set('reconnecting', new Set());
    this.eventListeners.set('reconnected', new Set());

    this.setupVisibilityHandling();
  }

  private isWebSocketSupported(): boolean {
    return typeof WebSocket !== 'undefined';
  }

  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopHeartbeat();
      } else {
        if (this.isConnected()) {
          this.startHeartbeat();
        } else if (this.shouldReconnect && this.state === 'disconnected') {
          this.connect().catch((error) => {
            console.error('Failed to reconnect after visibility change:', error);
          });
        }
      }
    });
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return url;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    if (url.startsWith('/')) {
      return `${protocol}//${window.location.host}${url}`;
    }

    return `${protocol}//${url}`;
  }

  /**
   * Gets the current connection state.
   *
   * @returns The current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Checks if the client is currently connected.
   *
   * @returns True if connected and WebSocket is open
   */
  public isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Establishes a connection to the WebSocket server.
   *
   * Automatically starts heartbeat monitoring and flushes queued messages on success.
   * If connection fails, it will automatically retry based on reconnection settings.
   *
   * @returns Promise that resolves when connected or rejects on timeout/error
   * @throws {Error} If connection times out or fails
   */
  public async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected') {
      console.warn('WebSocket already connecting or connected');
      return;
    }

    this.shouldReconnect = true;
    this.state = 'connecting';

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.connectionTimeout = window.setTimeout(() => {
          if (this.state === 'connecting') {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, this.options.timeout);

        this.ws.onopen = () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          this.state = 'connected';
          this.connectedAt = Date.now();

          const wasReconnecting = this.reconnectAttempts > 0;
          this.reconnectAttempts = 0;

          this.emit('open');

          if (wasReconnecting) {
            this.emit('reconnected');
          }

          this.flushMessageQueue();
          this.startHeartbeat();
          resolve();
        };

        this.ws.onclose = (event) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          this.stopHeartbeat();

          const wasConnected = this.state === 'connected';
          this.state = 'disconnected';
          this.ws = null;

          this.emit('close', { code: event.code, reason: event.reason });

          if (this.shouldReconnect && this.options.reconnect) {
            const connectionDuration = this.connectedAt ? Date.now() - this.connectedAt : 0;

            if (connectionDuration > 30000) {
              this.reconnectAttempts = 0;
            }

            this.scheduleReconnect();
          }

          if (!wasConnected) {
            reject(new Error(`Connection failed: ${event.reason || 'Unknown reason'}`));
          }
        };

        this.ws.onerror = (event) => {
          this.emit('error', event);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            if (message.type === 'pong') {
              this.lastPongReceived = Date.now();
              if (this.heartbeatTimeout) {
                clearTimeout(this.heartbeatTimeout);
                this.heartbeatTimeout = null;
              }
            } else if (message.type === 'ping') {
              this.send({ type: 'pong', data: null, timestamp: Date.now() });
            } else {
              this.emit('message', message);
            }
          } catch (error) {
            this.emit('error', { message: 'Failed to parse message', error });
          }
        };
      } catch (error) {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        this.state = 'disconnected';
        reject(error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.emit('error', {
        message: `Max reconnection attempts (${this.options.maxReconnectAttempts}) reached`,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts - 1),
      this.options.maxReconnectInterval
    );

    this.state = 'reconnecting';
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnects from the WebSocket server and prevents automatic reconnection.
   *
   * Cleans up all timers, stops heartbeat, and closes the connection gracefully.
   */
  public disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.state = 'disconnected';
    this.reconnectAttempts = 0;
  }

  /**
   * Sends a message to the WebSocket server.
   *
   * If disconnected, the message is queued and will be sent on reconnection.
   * Queue has a maximum size of 50 messages (oldest are discarded).
   *
   * @param message - The message to send
   */
  public send(message: WebSocketMessage): void {
    const messageWithTimestamp: WebSocketMessage = {
      ...message,
      timestamp: message.timestamp || Date.now(),
    };

    if (this.isConnected() && this.ws) {
      try {
        this.ws.send(JSON.stringify(messageWithTimestamp));
      } catch (error) {
        this.emit('error', { message: 'Failed to send message', error });
        this.queueMessage(messageWithTimestamp);
      }
    } else {
      this.queueMessage(messageWithTimestamp);
    }
  }

  private queueMessage(message: WebSocketMessage): void {
    const MAX_QUEUE_SIZE = 50;

    if (this.messageQueue.length >= MAX_QUEUE_SIZE) {
      this.messageQueue.shift();
    }

    this.messageQueue.push(message);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected() && this.ws) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          this.messageQueue.unshift(message);
          this.emit('error', { message: 'Failed to flush message queue', error });
          break;
        }
      }
    }
  }

  /**
   * Registers an event listener for the specified event.
   *
   * @param event - The event type to listen for
   * @param callback - The callback function to invoke when the event occurs
   */
  public on(event: EventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.add(callback);
  }

  /**
   * Removes an event listener for the specified event.
   *
   * @param event - The event type
   * @param callback - The callback function to remove
   */
  public off(event: EventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: EventType, data?: unknown): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    const HEARTBEAT_INTERVAL = 30000;
    const HEARTBEAT_TIMEOUT = 5000;

    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', data: null, timestamp: Date.now() });

        this.heartbeatTimeout = window.setTimeout(() => {
          console.error('No pong received, reconnecting...');
          this.ws?.close();
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Destroys the WebSocket client and cleans up all resources.
   *
   * Disconnects, removes all event listeners, clears message queue, and stops all timers.
   * Should be called when the client is no longer needed.
   */
  public destroy(): void {
    this.disconnect();

    this.eventListeners.forEach((listeners) => listeners.clear());
    this.messageQueue = [];
    this.connectedAt = null;
  }

  /**
   * Gets the current number of reconnection attempts.
   *
   * @returns The number of reconnection attempts since last successful connection
   */
  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Gets the number of messages currently queued for sending.
   *
   * @returns The number of messages in the queue
   */
  public getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }
}
