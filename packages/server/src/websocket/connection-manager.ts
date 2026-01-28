import type { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type { ConnectionInfo } from './types.js';

/**
 * Manages active WebSocket connections
 */
export class ConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();

  /**
   * Add a new connection with a unique session ID
   */
  addConnection(socket: WebSocket): string {
    const sessionId = randomUUID();

    const connectionInfo: ConnectionInfo = {
      sessionId,
      socket,
      connectedAt: new Date()
    };

    this.connections.set(sessionId, connectionInfo);

    return sessionId;
  }

  /**
   * Remove a connection by session ID
   */
  removeConnection(sessionId: string): boolean {
    return this.connections.delete(sessionId);
  }

  /**
   * Get connection info by session ID
   */
  getConnection(sessionId: string): ConnectionInfo | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * Get the WebSocket by session ID
   */
  getSocket(sessionId: string): WebSocket | undefined {
    return this.connections.get(sessionId)?.socket;
  }

  /**
   * Check if a connection exists
   */
  hasConnection(sessionId: string): boolean {
    return this.connections.has(sessionId);
  }

  /**
   * Get all active connection IDs
   */
  getActiveConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get the number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Send a message to a specific session
   */
  sendToSession(sessionId: string, message: string): boolean {
    const socket = this.getSocket(sessionId);

    if (!socket) {
      console.error(`Session ${sessionId} not found`);
      return false;
    }

    if (socket.readyState !== socket.OPEN) {
      console.warn(`Socket for session ${sessionId} is not open (state: ${socket.readyState})`);
      return false;
    }

    try {
      socket.send(message);
      return true;
    } catch (error) {
      console.error(`Failed to send message to session ${sessionId}:`, error);
      // Remove connection if send fails
      this.removeConnection(sessionId);
      return false;
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: string): void {
    this.connections.forEach((connection) => {
      if (connection.socket.readyState === connection.socket.OPEN) {
        try {
          connection.socket.send(message);
        } catch (error) {
          console.error(`Failed to broadcast to session ${connection.sessionId}:`, error);
        }
      }
    });
  }

  /**
   * Clean up closed connections
   */
  cleanupClosedConnections(): number {
    let cleaned = 0;

    this.connections.forEach((connection, sessionId) => {
      if (connection.socket.readyState === connection.socket.CLOSED) {
        this.connections.delete(sessionId);
        cleaned++;
      }
    });

    return cleaned;
  }
}
