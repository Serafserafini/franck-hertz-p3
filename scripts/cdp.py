#!/usr/bin/env python3
"""Minimal Chrome DevTools client (stdlib only). Needs scripts/browser.sh running.
Usage: cdp.py URL [--wait SEC] [--w W] [--h H] [--dark] [--clickjs JS] [--eval JS]... [--shot FILE] [--clip x,y,w,h]
--clickjs: JS returning [x, y] viewport coordinates of a real mouse click. --eval: JS evaluated after the wait
(promises are awaited); results are printed as JSON. The cache is disabled."""
import argparse, base64, json, os, socket, struct, sys, time, urllib.request

class WS:
    def __init__(self, url):
        assert url.startswith('ws://')
        hp, path = url[5:].split('/', 1)
        host, port = hp.split(':')
        self.s = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f'GET /{path} HTTP/1.1\r\nHost: {hp}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        buf = b''
        while b'\r\n\r\n' not in buf: buf += self.s.recv(1)
        self.buf = b''
        self.id = 0
    def send(self, obj):
        data = json.dumps(obj).encode()
        hdr = bytearray([0x81]); n = len(data)
        if n < 126: hdr.append(0x80 | n)
        elif n < 65536: hdr.append(0x80 | 126); hdr += struct.pack('>H', n)
        else: hdr.append(0x80 | 127); hdr += struct.pack('>Q', n)
        mask = os.urandom(4); hdr += mask
        self.s.sendall(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
    def _read(self, n):
        while len(self.buf) < n:
            c = self.s.recv(65536)
            if not c: raise EOFError
            self.buf += c
        r, self.buf = self.buf[:n], self.buf[n:]
        return r
    def recv(self):
        msg = b''
        while True:
            b1, b2 = self._read(2)
            op = b1 & 0x0f; n = b2 & 0x7f
            if n == 126: n = struct.unpack('>H', self._read(2))[0]
            elif n == 127: n = struct.unpack('>Q', self._read(8))[0]
            payload = self._read(n)
            if op in (0, 1, 2): msg += payload
            if b1 & 0x80 and op in (0, 1, 2): return json.loads(msg)
    def call(self, method, params=None):
        self.id += 1; i = self.id
        self.send({'id': i, 'method': method, 'params': params or {}})
        while True:
            m = self.recv()
            if m.get('id') == i: return m

ap = argparse.ArgumentParser()
ap.add_argument('url'); ap.add_argument('--wait', type=float, default=5)
ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=900)
ap.add_argument('--eval', action='append', default=[]); ap.add_argument('--shot'); ap.add_argument('--clip')
ap.add_argument('--clickjs'); ap.add_argument('--port', type=int, default=9333); ap.add_argument('--dark', action='store_true')
a = ap.parse_args()
req = urllib.request.Request(f'http://localhost:{a.port}/json/new?{a.url}', method='PUT')
tgt = json.load(urllib.request.urlopen(req))
ws = WS(tgt['webSocketDebuggerUrl'])
ws.call('Page.enable'); ws.call('Runtime.enable'); ws.call('Network.enable'); ws.call('Network.setCacheDisabled', {'cacheDisabled': True})
ws.call('Emulation.setDeviceMetricsOverride', {'width': a.w, 'height': a.h, 'deviceScaleFactor': 1, 'mobile': False})
if a.dark: ws.call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-color-scheme', 'value': 'dark'}]})
ws.call('Page.navigate', {'url': a.url})
time.sleep(a.wait)
if a.clickjs:
    r = ws.call('Runtime.evaluate', {'expression': a.clickjs, 'returnByValue': True})
    x, y = r['result']['result']['value']
    for typ in ('mouseMoved', 'mousePressed', 'mouseReleased'):
        ws.call('Input.dispatchMouseEvent', {'type': typ, 'x': x, 'y': y, 'button': 'left', 'clickCount': 1})
    time.sleep(1)
for js in a.eval:
    r = ws.call('Runtime.evaluate', {'expression': js, 'awaitPromise': True, 'returnByValue': True})
    print(json.dumps(r.get('result', r), ensure_ascii=False)[:3000])
if a.shot:
    p = {'format': 'png'}
    if a.clip:
        x, y, w, h = map(float, a.clip.split(','))
        p['clip'] = {'x': x, 'y': y, 'width': w, 'height': h, 'scale': 1}
        p['captureBeyondViewport'] = True
    r = ws.call('Page.captureScreenshot', p)
    open(a.shot, 'wb').write(base64.b64decode(r['result']['data']))
urllib.request.urlopen(f"http://localhost:{a.port}/json/close/{tgt['id']}").read()
