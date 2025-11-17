"""add missing overlay columns

Revision ID: de81b1b6ecc8
Revises: edb9d397f9eb
Create Date: 2025-11-17 13:30:57.293374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de81b1b6ecc8'
down_revision: Union[str, Sequence[str], None] = 'edb9d397f9eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema — add new overlay URL columns."""
    op.add_column(
        'analysis_results',
        sa.Column('gradcam_image_url', sa.String(length=512), nullable=True)
    )
    op.add_column(
        'analysis_results',
        sa.Column('lime_image_url', sa.String(length=512), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema — remove the overlay URL columns."""
    op.drop_column('analysis_results', 'gradcam_image_url')
    op.drop_column('analysis_results', 'lime_image_url')

