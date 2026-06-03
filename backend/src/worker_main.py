"""
Worker process entry point.
Run this to start background job workers.

Usage:
    arq src.workers.tasks.WorkerSettings
"""

import logging
from arq import run_worker
from .workers.tasks import WorkerSettings
from .config import Config
from .observability import configure_logging

configure_logging()

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting SupoClip worker...")
    config = Config()
    if config.redis_url:
        import urllib.parse
        try:
            parsed = urllib.parse.urlparse(config.redis_url)
            logger.info(f"Redis: {parsed.hostname}:{parsed.port}")
        except Exception:
            logger.info("Redis: <url>")
    else:
        logger.info(f"Redis: {config.redis_host}:{config.redis_port}")
    run_worker(WorkerSettings)
