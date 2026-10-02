"""Start the standalone HeliLab app. Python 3; no extra packages or internet."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

ROOT = Path(__file__).resolve().parent
PORT = 8723
URL = f"http://localhost:{PORT}/HeliLab.html"

if __name__ == "__main__":
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    except OSError as error:
        raise SystemExit(f"Cannot start HeliLab on port {PORT}: {error}. Close another HeliLab server and try again.")
    print(f"HeliLab is ready: {URL}\nKeep this window open. Press Ctrl+C to stop.\nUse Learning record > Export to back up your work.", flush=True)
    webbrowser.open(URL)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
