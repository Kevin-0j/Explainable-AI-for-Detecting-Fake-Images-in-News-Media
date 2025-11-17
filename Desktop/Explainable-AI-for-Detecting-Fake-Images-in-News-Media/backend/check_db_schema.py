"""Utility to inspect the analysis_results table and Alembic status."""

import os
from pathlib import Path

from flask import Flask
from sqlalchemy import inspect, text

from backend.app import create_app
from backend.extensions import db
from backend.models import AnalysisResult


def _get_engine() -> object:
    app = create_app()
    with app.app_context():
        engine = db.get_engine()
    return engine


def _print_columns(engine):
    inspector = inspect(engine)
    table_name = AnalysisResult.__tablename__
    print(f"Inspecting columns for table '{table_name}':")
    columns = inspector.get_columns(table_name)
    for col in columns:
        print(f" - {col['name']} ({col['type']})")

    names = {col["name"] for col in columns}
    for overlay in ("gradcam_image_url", "lime_image_url"):
        status = "present" if overlay in names else "missing"
        print(f"Overlay column '{overlay}' is {status}.")


def _print_alembic_status(engine):
    print("\nAlembic revision info:")
    with engine.connect() as conn:
        try:
            version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        except Exception as exc:
            print(f"  Unable to read alembic_version table: {exc}")
            version = None
        if version:
            print(f"  Current alembic revision: {version}")
        else:
            print("  alembic_version table missing or empty.")

    versions_dir = Path(__file__).resolve().parents[1] / "migrations" / "versions"
    latest = None
    if versions_dir.exists():
        revisions = sorted(versions_dir.glob("*.py"))
        if revisions:
            latest = revisions[-1].name
            print(f"  Latest migration file: {latest}")
    if not latest:
        print("  No migration files found under migrations/versions.")


def main():
    engine = _get_engine()
    _print_columns(engine)
    _print_alembic_status(engine)


if __name__ == "__main__":
    main()
