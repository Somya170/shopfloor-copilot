'use client';
import { useEffect, useState, useRef } from 'react';

const EDGE_AI_URL = 'http://localhost:5005';

export interface MQTTSensorData {
  timestamp: number;
  seq?: number;
  aRMSx: number; aRMSy: number; aRMSz: number;
  vRMSx: number; vRMSy: number; vRMSz: number;
  temperature: number;
  aucausticRMS: number;
  mac?: string;
}

export function useMQTTData() {
  const [liveData,  setLiveData]  = useState<MQTTSensorData | null>(null);
  const [connected, setConnected] = useState(false);
  const [history,   setHistory]   = useState<MQTTSensorData[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLive = async () => {
    try {
      const res = await fetch(`${EDGE_AI_URL}/api/live-data`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      if (typeof d.temperature === 'number') {
        setLiveData(d);
        setConnected(true);
        // Build rolling history from live data
        setHistory(prev => {
          const next = [...prev, d];
          return next.slice(-100);
        });
      }
    } catch {
      setConnected(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${EDGE_AI_URL}/api/history?range=all&limit=100`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return;
      const d = await res.json();
      if (Array.isArray(d) && d.length > 0) {
        setHistory(d.filter((r: any) => typeof r.temperature === 'number'));
      }
    } catch {}
  };

  useEffect(() => {
    fetchHistory(); // load history on mount
    fetchLive();
    timerRef.current = setInterval(fetchLive, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Convert MQTT history to TelemetryChart format
  const chartHistory = history.map(d => ({
    timestamp:         new Date(d.timestamp).toISOString(),
    temperature:       d.temperature,
    vibration:         d.vRMSy,
    rpm:               d.vRMSx * 1000, // not real RPM — placeholder
    power_consumption: d.aucausticRMS,
    pressure:          d.aRMSy,
    is_anomaly:        false,
  }));

  return { liveData, connected, history, chartHistory };
}