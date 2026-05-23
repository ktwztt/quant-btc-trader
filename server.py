"""本地交易 API 服务器 — 通过 Clash 代理访问 Polymarket CLOB API。

用法：
  python server.py              # 默认端口 8080，代理 http://127.0.0.1:7890
  python server.py 9090         # 自定义端口
  python server.py 8080 socks5://127.0.0.1:7891  # 自定义代理
"""

import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# 添加 api 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

from trade import handler as TradeHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
PROXY = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:7890"

# 设置默认代理环境变量，trade.py 会读取
os.environ["POLY_PROXY_URL"] = PROXY

# 加载 .env 文件中的 ACCESS_PASSWORD
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if k.strip() not in os.environ:
                    os.environ[k.strip()] = v


class LocalHandler(TradeHandler):
    """路由 /api/auth 到本地认证，/api/trade 到 Polymarket 交易。"""

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/auth":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body)
                password = data.get("password", "")
                expected = os.environ.get("ACCESS_PASSWORD", "")
                if expected and password == expected:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": True}).encode())
                else:
                    self.send_response(401)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "密码错误"}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            super().do_POST()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/auth":
            self.send_response(405)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Method not allowed"}).encode())
        else:
            super().do_GET()

if __name__ == "__main__":
    print(f"=" * 50)
    print(f"  Polymarket 本地交易 API")
    print(f"  端口: {PORT}")
    print(f"  代理: {PROXY}")
    print(f"  地址: http://localhost:{PORT}")
    print(f"=" * 50)
    print()

    server = HTTPServer(("0.0.0.0", PORT), LocalHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
        server.server_close()
