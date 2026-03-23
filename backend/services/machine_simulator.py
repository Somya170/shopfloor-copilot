"""
factory-ai-platform · services/machine_simulator.py
Generates realistic telemetry for 5 machines every N seconds.
Publishes to Redis pub/sub channel for WebSocket distribution.
"""
import logging
import math
import random
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from database.cache import publish
from database.db import execute_many, execute_write
from config.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class MachineProfile:
    machine_id:   int
    machine_name: str
    # Normal operating ranges
    temp_base:    float = 70.0
    temp_range:   float = 10.0
    vib_base:     float = 0.12
    vib_range:    float = 0.04
    rpm_base:     float = 3200.0
    rpm_range:    float = 300.0
    power_base:   float = 1000.0
    power_range:  float = 150.0
    # Internal state
    fault_mode:   bool  = False
    fault_type:   str   = ""
    fault_prob:   float = 0.02   # probability of entering fault mode
    phase_offset: float = 0.0


class MachineSimulator:
    """Thread-safe background simulator."""

    def __init__(self):
        self._running   = False
        self._thread: Optional[threading.Thread] = None
        self._profiles: list[MachineProfile] = []
        self._tick = 0

    # ── lifecycle ─────────────────────────────────────────────

    def start(self) -> None:
        self._load_machines()
        self._running = True
        self._thread  = threading.Thread(target=self._loop, daemon=True, name="simulator")
        self._thread.start()
        logger.info("Machine simulator started (%d machines)", len(self._profiles))

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("Machine simulator stopped")

    # ── internal ─────────────────────────────────────────────

    def _load_machines(self) -> None:
        rows = execute_many("SELECT id, machine_name FROM machines ORDER BY id")
        offsets = [0, 1.2, 2.5, 0.7, 3.8]
        for i, row in enumerate(rows):
            self._profiles.append(MachineProfile(
                machine_id=row["id"],
                machine_name=row["machine_name"],
                phase_offset=offsets[i % len(offsets)],
            ))

    def _loop(self) -> None:
        interval = settings.SIMULATOR_INTERVAL_SEC
        while self._running:
            t0 = time.time()
            self._tick += 1
            for profile in self._profiles:
                reading = self._generate(profile)
                self._persist(reading, profile)
                publish("telemetry", reading)
            elapsed = time.time() - t0
            sleep_for = max(0, interval - elapsed)
            time.sleep(sleep_for)

    def _generate(self, p: MachineProfile) -> dict:
        t = self._tick + p.phase_offset

        # --- fault state machine ---
        if not p.fault_mode and random.random() < p.fault_prob:
            p.fault_mode = True
            p.fault_type = random.choice(["high_temp", "high_vibration", "rpm_drop", "power_spike"])
            logger.debug("Machine %s entering fault: %s", p.machine_name, p.fault_type)
        elif p.fault_mode and random.random() < 0.08:  # 8% chance to recover each tick
            p.fault_mode = False
            p.fault_type = ""

        # --- base sinusoidal oscillation ---
        sin_t = math.sin(t * 0.1)
        noise = lambda s: random.gauss(0, s)

        temperature = p.temp_base + p.temp_range * 0.5 * sin_t + noise(1.2)
        vibration   = p.vib_base  + p.vib_range  * 0.5 * abs(sin_t) + noise(0.005)
        rpm         = p.rpm_base  + p.rpm_range   * 0.3 * sin_t + noise(20)
        power       = p.power_base + p.power_range * 0.4 * sin_t + noise(15)

        # --- apply fault deltas ---
        if p.fault_mode:
            if p.fault_type == "high_temp":
                temperature += random.uniform(20, 40)
            elif p.fault_type == "high_vibration":
                vibration   += random.uniform(0.3, 0.7)
            elif p.fault_type == "rpm_drop":
                rpm         -= random.uniform(800, 1500)
            elif p.fault_type == "power_spike":
                power       += random.uniform(400, 800)

        return {
            "machine_id":        p.machine_id,
            "machine_name":      p.machine_name,
            "temperature":       round(max(20, temperature), 2),
            "vibration":         round(max(0, vibration), 4),
            "rpm":               round(max(0, rpm), 1),
            "power_consumption": round(max(0, power), 2),
            "pressure":          round(random.uniform(95, 105), 2),
            "fault_mode":        p.fault_mode,
            "fault_type":        p.fault_type,
            "timestamp":         datetime.now(timezone.utc).isoformat(),
        }

    def _persist(self, reading: dict, profile: MachineProfile) -> None:
        """Write one telemetry row; anomaly score is filled by the detector separately."""
        try:
            execute_write(
                """
                INSERT INTO machine_data
                    (machine_id, temperature, vibration, rpm, power_consumption, pressure, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    reading["machine_id"],
                    reading["temperature"],
                    reading["vibration"],
                    reading["rpm"],
                    reading["power_consumption"],
                    reading["pressure"],
                ),
            )
        except Exception as exc:
            logger.error("Failed to persist telemetry for %s: %s", profile.machine_name, exc)


# ── singleton ────────────────────────────────────────────────
simulator = MachineSimulator()