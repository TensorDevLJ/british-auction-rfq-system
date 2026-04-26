/**
 * hooks/useSocket.js
 * Custom React hook for WebSocket real-time communication
 */
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';

let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

/**
 * useSocket - Connect to specific RFQ room and listen for events
 * @param {string} rfqId - RFQ ID to join room for
 * @param {Object} handlers - Event handlers { eventName: callback }
 */
export function useSocket(rfqId, handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const s = getSocket();

    if (rfqId) {
      s.emit('join-rfq', rfqId);
    }

    // Register handlers
    const entries = Object.entries(handlersRef.current);
    entries.forEach(([event, fn]) => s.on(event, fn));

    return () => {
      entries.forEach(([event, fn]) => s.off(event, fn));
      if (rfqId) s.emit('leave-rfq', rfqId);
    };
  }, [rfqId]);

  const emit = useCallback((event, data) => {
    getSocket().emit(event, data);
  }, []);

  return { emit };
}

export default useSocket;
