"""Local sourcing research prototype. Python 3.10+, standard library only."""
import json
import os
import time
import uuid
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parent
TOKEN = os.environ.get('TREG_TOKEN', '')
TEAM = os.environ.get('TREG_ORG', '')
SPENT_LIMIT = 0.10
reserved = 0.0


def search(query):
    global reserved
    if not TOKEN:
        raise ValueError('实时模式未配置 TREG_TOKEN；可先查看实测回放。')
    if reserved + 0.01 > SPENT_LIMIT + 1e-9:
        raise ValueError('本次启动的实时调用额度已用完（按每次 $0.01 预留，最多10次）。')
    reserved += 0.01  # Includes unknown outcomes after network failures; no automatic retry.
    headers = {'X-Treg-Token': TOKEN, 'Content-Type': 'application/json',
               'X-Treg-Route-Max-Cost': '0.01', 'Idempotency-Key': str(uuid.uuid4())}
    if TEAM:
        headers['X-Treg-Org'] = TEAM
    req = Request('https://treg.to/call/treg.web.search',
                  data=json.dumps({'q': query, 'limit': 5}).encode(), headers=headers)
    started = time.perf_counter()
    try:
        with urlopen(req, timeout=65) as response:
            body = json.load(response)
            cost = response.headers.get('X-Treg-Cost-Micro')
            return {'body': body, 'elapsed_ms': round((time.perf_counter()-started)*1000),
                    'call_id': response.headers.get('X-Treg-Call-Id'),
                    'cost_usd': int(cost)/1000000 if cost is not None else None,
                    'query': query, 'status': response.status}
    except HTTPError as error:
        raise ValueError(f'treg 返回 HTTP {error.code}；本次不自动重试，请检查授权、余额或查询。') from error


class Handler(BaseHTTPRequestHandler):
    def send(self, status, data, kind='application/json; charset=utf-8'):
        raw = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        files = {'/': ('index.html', 'text/html; charset=utf-8'),
                 '/app.js': ('app.js', 'text/javascript; charset=utf-8'),
                 '/data': ('data/observations.json', 'application/json; charset=utf-8')}
        if self.path == '/config':
            return self.send(200, {'live': bool(TOKEN)})
        if self.path not in files:
            return self.send(404, {'error': '页面不存在'})
        name, kind = files[self.path]
        self.send(200, (ROOT/name).read_bytes(), kind)

    def do_POST(self):
        if self.path != '/search':
            return self.send(404, {'error': '接口不存在'})
        # Same-origin local UI only. Prevent websites from spending the local token.
        if self.headers.get('Origin') != f'http://127.0.0.1:{self.server.server_port}':
            return self.send(403, {'error': '请从本机原型页面发起查询'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 8192:
                raise ValueError('请求长度不正确')
            data = json.loads(self.rfile.read(length))
            query = data.get('query') if isinstance(data, dict) else None
            if not isinstance(query, str) or not 1 <= len(query.strip()) <= 400:
                raise ValueError('查询应为1至400个字符')
            self.send(200, search(query.strip()))
        except (ValueError, UnicodeError) as error:
            self.send(400, {'error': str(error)})
        except (TimeoutError, OSError):
            self.send(502, {'error': '网络未返回完整结果，费用状态未知；请核查 treg Activity，勿反复点击。'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '4386'))
    print(f'寻访研究台：http://127.0.0.1:{port}', flush=True)
    HTTPServer(('127.0.0.1', port), Handler).serve_forever()
