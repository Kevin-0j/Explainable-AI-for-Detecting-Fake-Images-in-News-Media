from datetime import datetime

import pytest

from backend.app import create_app
from backend.extensions import db
from backend.models import AnalysisResult, MediaFile, User


FAKE_GRADCAM = "/uploads/gradcam/fake_gradcam.png"
FAKE_LIME = "/uploads/lime/fake_lime.png"


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        with app.app_context():
            yield client


@pytest.fixture
def authenticated_user():
    user = User.query.filter_by(email="history-test@example.com").first()
    if not user:
        user = User(username="history-test", email="history-test@example.com")
        user.set_password("test123")
        db.session.add(user)
        db.session.commit()
    return user


def _create_media_for_user(user: User) -> MediaFile:
    media = MediaFile(
        user_id=user.id,
        original_filename="history.png",
        stored_filename="history.png",
        storage_path="/uploads/history.png",
        file_type="png",
        file_size=1,
        checksum="deadbeef",
        uploaded_at=datetime.utcnow(),
        last_analyzed_at=datetime.utcnow(),
    )
    db.session.add(media)
    db.session.flush()
    return media


def _insert_analysis(user: User, media: MediaFile, *, with_overlays: bool, created_at: datetime):
    analysis = AnalysisResult(
        user_id=user.id,
        media_file_id=media.id,
        model_id=None,
        prediction_label="fake",
        confidence_score=0.75,
        processing_time_ms=10,
        analysis_metadata={"note": "history test"},
        gradcam_image_url=FAKE_GRADCAM if with_overlays else None,
        lime_image_url=FAKE_LIME if with_overlays else None,
        created_at=created_at,
    )
    db.session.add(analysis)
    db.session.commit()
    return analysis


@pytest.fixture(autouse=True)
def disable_jwt(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        "flask_jwt_extended.view_decorators.verify_jwt_in_request",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr("backend.routes.log_action", lambda *args, **kwargs: None)
    monkeypatch.setattr("backend.routes.run_inference", lambda *args, **kwargs: pytest.fail("run_inference called"))
    monkeypatch.setattr(
        "backend.routes.generate_lime_visualization",
        lambda *args, **kwargs: pytest.fail("generate_lime_visualization should not run"),
    )


def test_history_includes_overlay_urls(client, authenticated_user, monkeypatch):
    user = authenticated_user
    monkeypatch.setattr("backend.routes._get_authenticated_user", lambda: (user, None))

    media_with = _create_media_for_user(user)
    media_without = _create_media_for_user(user)

    analysis_with = _insert_analysis(
        user,
        media_with,
        with_overlays=True,
        created_at=datetime.utcnow(),
    )
    analysis_without = _insert_analysis(
        user,
        media_without,
        with_overlays=False,
        created_at=datetime.utcnow(),
    )

    response = client.get("/api/history")
    assert response.status_code == 200

    data = response.get_json()
    results = data.get("results", [])

    record_map = {item["id"]: item for item in results if item.get("id")}
    assert analysis_with.id in record_map
    assert analysis_without.id in record_map

    with_overlays = record_map[analysis_with.id]
    assert with_overlays["gradcam_image_url"] == FAKE_GRADCAM
    assert with_overlays["lime_image_url"] == FAKE_LIME

    without_overlays = record_map[analysis_without.id]
    assert "gradcam_image_url" in without_overlays
    assert without_overlays["gradcam_image_url"] is None
    assert "lime_image_url" in without_overlays
    assert without_overlays["lime_image_url"] is None

    db.session.delete(analysis_with)
    db.session.delete(analysis_without)
    db.session.delete(media_with)
    db.session.delete(media_without)
    db.session.commit()
