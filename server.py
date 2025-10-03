#!/usr/bin/env python3
"""
Simple HTTP server for testing the Fast Lease application locally.
This resolves CORS issues with ES6 modules when running from file:// protocol.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

PORT = 3000

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for ES6 modules
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def guess_type(self, path):
        # Ensure JavaScript files are served with correct MIME type
        result = super().guess_type(path)
        # Handle different return value formats across Python versions
        if isinstance(result, tuple):
            mimetype, encoding = result
        else:
            mimetype = result
        if path.endswith('.js'):
            return 'application/javascript'
        return mimetype

def start_server():
    """Start the HTTP server and open browser"""
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"🚀 Fast Lease server running at http://localhost:{PORT}")
            print(f"📁 Serving from: {os.getcwd()}")

            # Open browser automatically
            webbrowser.open(f'http://localhost:{PORT}')

            print("\n📋 Available routes:")
            print(f"   • Main site: http://localhost:{PORT}/index.html")
            print(f"   • Admin: http://localhost:{PORT}/admin/bpm/index.html")
            print(f"   • Operations: http://localhost:{PORT}/ops/dashboard/index.html")
            print(f"   • Client dashboard: http://localhost:{PORT}/client/dashboard/index.html")
            print(f"   • Investor dashboard: http://localhost:{PORT}/investor/dashboard/index.html")

            print("\n🔧 Press Ctrl+C to stop the server")
            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use. Try a different port or stop the existing server.")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()