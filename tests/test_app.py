from app import app, bytes_to_human, collect_metrics


def test_bytes_to_human():
    assert bytes_to_human(0) == "0.0 B"
    assert bytes_to_human(1024) == "1.0 KB"
    assert bytes_to_human(1024**2) == "1.0 MB"


def test_health_endpoint():
    client = app.test_client()
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_metrics_endpoint_shape():
    client = app.test_client()
    response = client.get("/api/metrics")
    assert response.status_code == 200
    payload = response.get_json()
    assert {"timestamp", "host", "cpu", "memory", "disk", "network"} <= payload.keys()
    assert 0 <= payload["cpu"]["usage_percent"] <= 100
    assert 0 <= payload["memory"]["usage_percent"] <= 100
    assert 0 <= payload["disk"]["usage_percent"] <= 100


def test_collect_metrics_has_human_readable_values():
    metrics = collect_metrics()
    assert metrics["memory"]["total_human"]
    assert metrics["disk"]["total_human"]
    assert metrics["network"]["sent_human"]
