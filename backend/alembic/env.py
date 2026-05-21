import os
import sys
from logging.config import fileConfig

# Ensure the backend root is on the path so `app` is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# Load .env from the backend root regardless of where alembic is invoked
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), encoding="utf-8-sig")

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import all models so Alembic can detect them
from app.database import Base  # noqa: E402
from app.models import (  # noqa: E402, F401
    Appointment, Business, BusinessPhoto, Service, Staff, User,
)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    from sqlalchemy import create_engine
    connectable = create_engine(os.environ["ALEMBIC_DATABASE_URL"], poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
