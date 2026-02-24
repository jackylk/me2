"""In-memory metrics collector for API and LLM monitoring.

Uses a ring buffer of data points (last 24h). Resets on server restart.
"""
import time
import threading
from collections import defaultdict, deque
from dataclasses import dataclass, field


@dataclass
class ApiMetric:
    path: str
    method: str
    status_code: int
    duration_ms: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class LLMMetric:
    model: str
    prompt_tokens: int
    completion_tokens: int
    duration_ms: float
    success: bool
    timestamp: float = field(default_factory=time.time)


class MetricsCollector:
    """Singleton in-memory metrics store."""

    _instance = None
    _lock = threading.Lock()
    MAX_POINTS = 100_000  # ~24h at moderate traffic

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._api_metrics = deque(maxlen=cls.MAX_POINTS)
                cls._instance._llm_metrics = deque(maxlen=cls.MAX_POINTS)
                cls._instance._start_time = time.time()
            return cls._instance

    def record_api(self, path: str, method: str, status_code: int, duration_ms: float):
        self._api_metrics.append(ApiMetric(path, method, status_code, duration_ms))

    def record_llm(self, model: str, prompt_tokens: int, completion_tokens: int,
                   duration_ms: float, success: bool):
        self._llm_metrics.append(LLMMetric(model, prompt_tokens, completion_tokens,
                                            duration_ms, success))

    def get_uptime(self) -> float:
        return time.time() - self._start_time

    def get_api_stats(self, last_seconds: int = 86400) -> dict:
        """Get API performance stats for the given time window."""
        cutoff = time.time() - last_seconds
        recent = [m for m in self._api_metrics if m.timestamp > cutoff]

        if not recent:
            return {"total_requests": 0, "endpoints": {}}

        by_endpoint: dict[str, list[float]] = defaultdict(list)
        for m in recent:
            key = f"{m.method} {m.path}"
            by_endpoint[key].append(m.duration_ms)

        endpoints = {}
        for key, durations in sorted(by_endpoint.items(), key=lambda x: -len(x[1])):
            sorted_d = sorted(durations)
            p95_idx = int(len(sorted_d) * 0.95)
            endpoints[key] = {
                "count": len(durations),
                "avg_ms": round(sum(durations) / len(durations), 1),
                "p95_ms": round(sorted_d[min(p95_idx, len(sorted_d) - 1)], 1),
            }

        error_count = sum(1 for m in recent if m.status_code >= 400)

        return {
            "total_requests": len(recent),
            "error_count": error_count,
            "endpoints": endpoints,
        }

    def get_llm_stats(self, last_seconds: int = 86400) -> dict:
        """Get LLM call stats for the given time window."""
        cutoff = time.time() - last_seconds
        recent = [m for m in self._llm_metrics if m.timestamp > cutoff]

        if not recent:
            return {"total_calls": 0, "total_prompt_tokens": 0,
                    "total_completion_tokens": 0, "avg_duration_ms": 0,
                    "failure_rate": 0}

        total_prompt = sum(m.prompt_tokens for m in recent)
        total_completion = sum(m.completion_tokens for m in recent)
        avg_duration = sum(m.duration_ms for m in recent) / len(recent)
        failures = sum(1 for m in recent if not m.success)

        # Today's calls
        today_start = time.time() - (time.time() % 86400)
        today_calls = sum(1 for m in recent if m.timestamp > today_start)

        return {
            "total_calls": len(recent),
            "today_calls": today_calls,
            "total_prompt_tokens": total_prompt,
            "total_completion_tokens": total_completion,
            "avg_duration_ms": round(avg_duration, 1),
            "failure_rate": round(failures / len(recent), 4) if recent else 0,
        }
