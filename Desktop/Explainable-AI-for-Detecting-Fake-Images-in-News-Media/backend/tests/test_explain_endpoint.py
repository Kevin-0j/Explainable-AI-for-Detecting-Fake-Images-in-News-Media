import json
from types import SimpleNamespace

import pytest

from backend.app import create_app


def _patch_openai(monkeypatch, response_content: str):
    """Set up a simple OpenAI stub that returns the provided content."""
    class FakeClient:
        def __init__(self, *args, **kwargs):
            self.chat = SimpleNamespace(completions=self)
            self._content = response_content

        def create(self, *args, **kwargs):
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=self._content))]
            )

    monkeypatch.setattr("backend.routes.OpenAI", FakeClient)


@pytest.fixture(autouse=True)
def _disable_auth(monkeypatch):
    """Bypass JWT checks and replace persistence/logging with no-ops."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        "flask_jwt_extended.view_decorators.verify_jwt_in_request",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr(
        "backend.routes._get_authenticated_user",
        lambda: (SimpleNamespace(id=1, is_admin=True), None),
    )
    monkeypatch.setattr("backend.routes.log_action", lambda *args, **kwargs: None)
    session_stub = SimpleNamespace(
        add=lambda *args, **kwargs: None,
        commit=lambda *args, **kwargs: None,
        rollback=lambda *args, **kwargs: None,
    )
    monkeypatch.setattr("backend.routes.db.session", session_stub)


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def _build_payload():
    return {
        "prediction": "fake",
        "confidence": 0.78,
        "file_name": "example.png",
        "caption": "Evidence photo",
    }


def test_explain_returns_structured_analysis(client, monkeypatch):
    sample_payload = {
        "risk_level": "low",
        "tldr": "The subject looks authentic.",
        "key_cues": ["Clean lighting", "Consistent reflections"],
        "next_steps": ["Publish with attribution", "Archive the source image"],
        "caveats": ["Model may miss frame interpolation artifacts."],
        "raw_text": "Detailed rationales here.",
    }
    _patch_openai(monkeypatch, json.dumps(sample_payload))

    response = client.post("/api/explain", json=_build_payload())
    assert response.status_code == 200

    data = response.get_json()
    assert "analysis" in data
    analysis = data["analysis"]
    assert analysis["risk_level"] == sample_payload["risk_level"]
    assert analysis["tldr"] == sample_payload["tldr"]
    assert analysis["key_cues"] == sample_payload["key_cues"]
    assert analysis["next_steps"] == sample_payload["next_steps"]
    assert analysis["caveats"] == sample_payload["caveats"]
    assert analysis["raw_text"] == sample_payload["raw_text"]
    assert isinstance(analysis["key_cues"], list)
    assert isinstance(analysis["next_steps"], list)
    assert isinstance(analysis["caveats"], list)


def test_explain_fallbacks_on_invalid_json(client, monkeypatch):
    _patch_openai(monkeypatch, "not valid json")

    response = client.post("/api/explain", json=_build_payload())
    assert response.status_code == 200

    data = response.get_json()
    analysis = data["analysis"]
    assert analysis["risk_level"] == "medium"
    assert analysis["key_cues"]
    assert analysis["next_steps"]
    assert analysis["caveats"]
    assert analysis["tldr"].startswith("not valid json")
    assert analysis["raw_text"] == "not valid json"
