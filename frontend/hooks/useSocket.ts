'use client';
// hooks/useSocket.ts

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TelemetryReading, Alert } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:5000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected]         = useState(false);
  const [latestTelemetry, setTelemetry]   = useState<Record<number, TelemetryReading>>({});
  const [latestAlert, setLatestAlert]     = useState<Alert | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('telemetry', (data: TelemetryReading) => {
      setTelemetry(prev => ({ ...prev, [data.machine_id]: data }));
    });

    socket.on('alert', (data: Alert) => {
      setLatestAlert(data);
    });

    return () => { socket.disconnect(); };
  }, []);

  const subscribeMachine = useCallback((machineId: number) => {
    socketRef.current?.emit('subscribe_machine', { machine_id: machineId });
  }, []);

  return { connected, latestTelemetry, latestAlert, subscribeMachine };
}