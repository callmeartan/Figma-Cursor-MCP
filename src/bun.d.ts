declare module 'bun' {
  export interface Server {
    upgrade(request: Request, options?: { headers?: Record<string, string> }): boolean;
    port: number;
  }

  export interface ServerWebSocket<T = any> {
    data: T;
    readyState: number;
    send(data: string | Uint8Array): void;
    close: () => void;
  }
}

declare const Bun: {
  serve(options: {
    port: number;
    fetch: (req: Request, server: import('bun').Server) => Response | Promise<Response> | void;
    websocket?: {
      open?: (ws: import('bun').ServerWebSocket<any>) => void;
      message?: (ws: import('bun').ServerWebSocket<any>, message: string | Uint8Array) => void;
      close?: (ws: import('bun').ServerWebSocket<any>) => void;
    };
  }): import('bun').Server;
};

// Fix WebSocket declaration by extending the existing interface
interface WebSocketConstants {
  OPEN: number;
} 