"""
cPanel Phusion Passenger WSGI Entry Point for SPHEREx Science Worker
Created for CloudLinux / cPanel 'Setup Python App'
"""
import sys
import os
import json

# Ensure worker and modules are on the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

def application(environ, start_response):
    path_info = environ.get('PATH_INFO', '/')

    # Optional webhook endpoint to trigger queue processing
    if path_info == '/run-queue':
        try:
            from worker import drain_queue
            from spherex.database import connect
            conn = connect()
            processed = drain_queue(conn)
            conn.close()
            status = '200 OK'
            response_headers = [('Content-Type', 'application/json; charset=utf-8')]
            start_response(status, response_headers)
            return [json.dumps({"status": "ok", "jobs_processed": processed}).encode('utf-8')]
        except Exception as e:
            status = '500 Internal Server Error'
            response_headers = [('Content-Type', 'application/json; charset=utf-8')]
            start_response(status, response_headers)
            return [json.dumps({"status": "error", "message": str(e)}).encode('utf-8')]

    status = '200 OK'
    response_headers = [('Content-Type', 'application/json; charset=utf-8')]
    start_response(status, response_headers)

    response = {
        "status": "online",
        "service": "NASA SPHEREx Science Worker",
        "python_version": sys.version.split()[0],
        "endpoints": {
            "/": "Service health check",
            "/run-queue": "Process pending jobs from queue"
        },
        "cron_recommendation": "To drain queue via cPanel Cron Jobs: python worker.py --once"
    }
    return [json.dumps(response, indent=2).encode('utf-8')]
