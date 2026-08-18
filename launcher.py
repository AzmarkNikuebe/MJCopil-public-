import os
import sys
import time
import subprocess
import threading
import http.server
import socketserver
import functools
import webview

class ThreadedHTTPServer:
    """Runs a simple HTTP server in a daemon thread on port 8000."""
    def __init__(self, port=8000):
        self.port = port
        self.server = None
        self.thread = None
        self.is_running = False

    def start(self):
        # Force directory to be the current working directory (project root)
        current_dir = os.getcwd()
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=current_dir)
        
        # Allow reusing address to prevent Port in use errors
        class ReusableTCPServer(socketserver.TCPServer):
            allow_reuse_address = True
            
        try:
            self.server = ReusableTCPServer(("127.0.0.1", self.port), handler)
            self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            self.thread.start()
            self.is_running = True
            print(f"[INFO] Frontend server started on port {self.port} at 127.0.0.1")
        except Exception as e:
            print(f"[ERROR] Failed to start frontend server: {e}")
            raise e

    def stop(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            self.is_running = False
            print("[INFO] Frontend server stopped.")

class DesktopApp:
    def __init__(self):
        self.frontend_server = ThreadedHTTPServer(8000)
        self.backend_process = None

    def start_servers(self):
        # 1. Start Frontend Server
        self.frontend_server.start()
        
        # 2. Start Backend Server
        if getattr(sys, 'frozen', False):
            base_dir = os.path.dirname(sys.executable)
            python_exe = "python"
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            python_exe = sys.executable
            
        backend_dir = os.path.join(base_dir, "backend")
        
        if not os.path.exists(os.path.join(backend_dir, "server.py")):
            raise FileNotFoundError(f"Le script backend/server.py est introuvable !\nChemin recherché: {backend_dir}")

        # Start FastAPI backend process
        self.backend_process = subprocess.Popen(
            [python_exe, "-m", "uvicorn", "server:app", "--port", "8001"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
        
        # Short pause to let backend initialize
        time.sleep(1.5)
        print("[INFO] Backend server started on port 8001.")

    def shutdown(self):
        print("[INFO] Stopping servers...")
        try:
            self.frontend_server.stop()
        except:
            pass

        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=2)
            except:
                try:
                    self.backend_process.kill()
                except:
                    pass
        print("[INFO] Shutdown completed.")

def run():
    # Ensure working directory is correct
    if getattr(sys, 'frozen', False):
        os.chdir(os.path.dirname(sys.executable))
    else:
        os.chdir(os.path.dirname(os.path.abspath(__file__)))
        
    app = DesktopApp()
    try:
        app.start_servers()
        
        # Create webview window
        window = webview.create_window(
            title="MJ Copilot V2",
            url="http://127.0.0.1:8000/index.html",
            width=1280,
            height=850,
            min_size=(1024, 768),
            resizable=True
        )
        
        # This will block until the window is closed
        webview.start()
    finally:
        # Stop all servers on window close
        app.shutdown()

if __name__ == "__main__":
    run()
