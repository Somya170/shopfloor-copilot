// types/index.ts — shared TypeScript types

export type UserRole = 'admin' | 'tech_staff' | 'non_tech_staff';
export type MachineStatus = 'normal' | 'warning' | 'critical' | 'offline';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_login?: string;
}

export interface Machine {
  id: number;
  machine_name: string;
  location: string;
  machine_type: string;
  status: MachineStatus;
  temperature?: number;
  vibration?: number;
  rpm?: number;
  power_consumption?: number;
  is_anomaly?: boolean;
  last_reading?: string;
}

export interface TelemetryReading {
  machine_id: number;
  machine_name: string;
  temperature: number;
  vibration: number;
  rpm: number;
  power_consumption: number;
  pressure: number;
  is_anomaly: boolean;
  anomaly_score: number;
  timestamp: string;
  alert?: string;
  severity?: AlertSeverity;
}

export interface Alert {
  id: number;
  machine_id: number;
  machine_name: string;
  alert_type: string;
  message: string;
  severity: AlertSeverity;
  is_resolved: boolean;
  timestamp: string;
}

export interface MachineStats {
  total_readings: number;
  avg_temp: number;
  max_temp: number;
  avg_vibration: number;
  max_vibration: number;
  avg_rpm: number;
  avg_power: number;
  anomaly_count: number;
  anomaly_rate_pct: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
}

export interface RAGResponse {
  answer: string;
  sources: string[];
  telemetry: string;
}

export interface Report {
  id?: number;
  title: string;
  machine_id?: number;
  machine_name?: string;
  report_type: string;
  generated_at?: string;
  period: { start: string; end: string; type: string };
  telemetry_stats?: {
    reading_count: number;
    temperature: { avg: number; max: number; min: number };
    vibration:   { avg: number; max: number };
    rpm:         { avg: number };
    power:       { avg: number; max: number };
    anomaly_count: number;
  };
  uptime_pct?: number;
  ai_summary?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}