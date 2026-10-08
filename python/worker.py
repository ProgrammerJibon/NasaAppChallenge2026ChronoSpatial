#!/usr/bin/env python3
"""SPHEREx Science Worker - Bounded Queue Daemon."""

import os
import sys
import time
import json
import logging
from datetime import datetime

from spherex import config
from spherex.database import connect, execute, query_one, encode_json
from spherex.jobs import handle_fetch_observations, handle_compare_epochs

logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","message":"%(message)s"}',
)
logger = logging.getLogger("spherex_worker")

def reset_stale_jobs(conn):
    """Restore jobs that crashed or timed out while processing."""
    count = execute(
        conn,
        """UPDATE processing_jobs
           SET status = 'queued', heartbeat_at = NULL
           WHERE status = 'processing'
             AND attempts < %s
             AND heartbeat_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL %s SECOND)""",
        (config.MAX_JOB_ATTEMPTS, config.JOB_TIMEOUT_SECONDS),
    )
    if count > 0:
        logger.warning(f"Reset {count} stale jobs back to queued state.")

def claim_job(conn):
    """Claim one queued job transactionally."""
    with conn.cursor() as cur:
        cur.execute(
            """SELECT * FROM processing_jobs
               WHERE status = 'queued'
               ORDER BY priority DESC, created_at ASC
               LIMIT 1
               FOR UPDATE"""
        )
        job = cur.fetchone()
        if not job:
            return None
            
        cur.execute(
            """UPDATE processing_jobs
               SET status = 'processing',
                   attempts = attempts + 1,
                   started_at = UTC_TIMESTAMP(3),
                   heartbeat_at = UTC_TIMESTAMP(3)
               WHERE id = %s""",
            (job["id"],),
        )
        return job

def run_job(conn, job):
    job_id = job["id"]
    job_type = job["type"]
    payload = json.loads(job["payload_json"]) if isinstance(job["payload_json"], str) else (job["payload_json"] or {})

    logger.info(f"Processing job {job_id} ({job_type})")

    def update_progress(percent: float):
        execute(
            conn,
            """UPDATE processing_jobs
               SET progress = %s, heartbeat_at = UTC_TIMESTAMP(3)
               WHERE id = %s""",
            (percent, job_id),
        )

    try:
        if job_type == "FETCH_OBSERVATIONS":
            result = handle_fetch_observations(payload, update_progress)
        elif job_type == "COMPARE_EPOCHS":
            result = handle_compare_epochs(payload, update_progress, conn)
        else:
            raise ValueError(f"Unknown job type: {job_type}")

        execute(
            conn,
            """UPDATE processing_jobs
               SET status = 'completed',
                   progress = 100.0,
                   result_json = %s,
                   completed_at = UTC_TIMESTAMP(3)
               WHERE id = %s""",
            (encode_json(result), job_id),
        )
        logger.info(f"Job {job_id} completed successfully.")
        return True
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)
        execute(
            conn,
            """UPDATE processing_jobs
               SET status = 'failed',
                   error = %s,
                   completed_at = UTC_TIMESTAMP(3)
               WHERE id = %s""",
            (str(e), job_id),
        )
        return False

def worker_loop(max_iterations: int | None = None, poll_interval: float = 2.0):
    logger.info("SPHEREx science worker started.")
    db_conn = connect()
    iterations = 0

    try:
        while max_iterations is None or iterations < max_iterations:
            iterations += 1
            try:
                reset_stale_jobs(db_conn)
                job = claim_job(db_conn)
                if job:
                    run_job(db_conn, job)
                else:
                    time.sleep(poll_interval)
            except Exception as e:
                logger.error(f"Worker iteration error: {e}")
                time.sleep(poll_interval)
                # Reconnect on database disconnect
                try:
                    db_conn.ping(reconnect=True)
                except Exception:
                    db_conn = connect()
    finally:
        db_conn.close()
        logger.info("SPHEREx science worker stopped.")

if __name__ == "__main__":
    worker_loop()
