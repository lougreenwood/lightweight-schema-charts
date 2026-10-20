/**
 * WebSocket wire protocol types.
 *
 * Defines the message contract for real-time communication between backend and frontend. Messages follow a consistent
 * structure with discriminated unions based on the `type` field.
 *
 * This module contains only the shared wire protocol shapes. Backend-only implementation details (BroadcastOptions,
 * ConnectionState, Subscription, WebSocketStats) live alongside the backend connection manager.
 */

import type { JsonApiSuccessDocument } from '#src/vendor/shared-utils/json-api/types';
import type {
  SerializedAppError,
  SerializedResult,
} from '#src/vendor/shared-utils/errors/serialized-app-error';
import type { LiteralUnion } from 'type-fest';

export type { LiteralUnion };

export const NO_CORRELATION_ID = '__NO_CORRELATION_ID__' as const;

export interface DataPayload {
  readonly operation: DataOperation;
  readonly payload: JsonApiSuccessDocument;
}

export interface SubscriptionConfirmedPayload {
  readonly channel: SubscriptionChannel;
}

export interface WebSocketMessageEnvelope<
  TOpts extends { ok?: unknown; err?: unknown },
> extends BaseMessage {
  readonly type: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly result: SerializedResult<
    TOpts extends { ok: infer TOk } ? TOk : never,
    TOpts extends { err: infer TErr extends SerializedAppError } ? TErr : never
  >;
}

/**
 * All possible client → server message types.
 */
export type ClientMessage = PingMessage | SubscribeMessage | UnsubscribeMessage;

/**
 * Operation type for data updates.
 */
export type DataOperation = 'created' | 'deleted' | 'updated';

/**
 * Client → Server: Ping to keep connection alive.
 */
export interface PingMessage extends BaseMessage {
  readonly type: 'ping';
}

/**
 * Server → Client: Pong response to ping.
 */
export interface PongMessage extends BaseMessage {
  readonly type: 'pong';
}

/**
 * Server → Client: Subscription removed confirmation.
 */
export interface UnsubscribedMessage extends CorrelatedBaseMessage {
  readonly channel: SubscriptionChannel;
  readonly type: 'unsubscribed';
}

/**
 * All possible server → client message types.
 */
export type ServerMessage =
  | WebSocketMessageEnvelope<{ ok: DataPayload }>
  | WebSocketMessageEnvelope<{ ok: SubscriptionConfirmedPayload }>
  | WebSocketMessageEnvelope<{ err: SerializedAppError }>
  | PongMessage
  | UnsubscribedMessage
  | WelcomeMessage;

/**
 * Client → Server: Subscribe to a channel.
 */
export interface SubscribeMessage extends CorrelatedBaseMessage {
  readonly channel: SubscriptionChannel;
  readonly filter?: Record<string, string> | undefined;

  readonly type: 'subscribe';
}

/**
 * Subscription channel types for real-time data streams.
 */
export type SubscriptionChannel = string;

/**
 * Client → Server: Unsubscribe from a data channel.
 */
export interface UnsubscribeMessage extends CorrelatedBaseMessage {
  readonly channel: SubscriptionChannel;
  readonly type: 'unsubscribe';
}

/**
 * Server → Client: Welcome message sent immediately after connection.
 */
export interface WelcomeMessage extends BaseMessage {
  readonly availableChannels: readonly SubscriptionChannel[];
  readonly type: 'welcome';
}

interface BaseMessage {
  readonly timestamp: string;
  readonly type: string;
}

interface CorrelatedBaseMessage extends BaseMessage {
  readonly correlationId: string;
}
