export interface OrderSocketPayload {
  orderId?: string | null;
  tableId?: string | null;
  // additional event-specific keys
  [key: string]: unknown;
}

export interface JoinResponse {
  ok?: boolean;
  [key: string]: unknown;
}

export type SocketAnyPayload = Record<string, unknown>;
