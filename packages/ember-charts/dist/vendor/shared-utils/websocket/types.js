/**
 * WebSocket wire protocol types.
 *
 * Defines the message contract for real-time communication between backend and frontend. Messages follow a consistent
 * structure with discriminated unions based on the `type` field.
 *
 * This module contains only the shared wire protocol shapes. Backend-only implementation details (BroadcastOptions,
 * ConnectionState, Subscription, WebSocketStats) live alongside the backend connection manager.
 */

const NO_CORRELATION_ID = '__NO_CORRELATION_ID__';

/**
 * All possible client → server message types.
 */

/**
 * Operation type for data updates.
 */

/**
 * Client → Server: Ping to keep connection alive.
 */

/**
 * Server → Client: Pong response to ping.
 */

/**
 * Server → Client: Subscription removed confirmation.
 */

/**
 * All possible server → client message types.
 */

/**
 * Client → Server: Subscribe to a channel.
 */

/**
 * Subscription channel types for real-time data streams.
 */

/**
 * Client → Server: Unsubscribe from a data channel.
 */

/**
 * Server → Client: Welcome message sent immediately after connection.
 */

export { NO_CORRELATION_ID };
//# sourceMappingURL=types.js.map
