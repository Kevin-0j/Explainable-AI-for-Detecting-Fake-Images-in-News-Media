"""add overlay urls to analysis results

Revision ID: 5d1a9f14ebae
Revises: 3bc2a9cd1469
Create Date: 2025-11-17 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5d1a9f14ebae'
down_revision = '3bc2a9cd1469'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('analysis_results', schema=None) as batch_op:
        batch_op.add_column(sa.Column('gradcam_image_url', sa.String(length=512), nullable=True))
        batch_op.add_column(sa.Column('lime_image_url', sa.String(length=512), nullable=True))


def downgrade():
    with op.batch_alter_table('analysis_results', schema=None) as batch_op:
        batch_op.drop_column('lime_image_url')
        batch_op.drop_column('gradcam_image_url')
