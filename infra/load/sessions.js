import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';
const responseAudio = new Trend('text_to_first_audio_ms', true),
  failures = new Rate('session_failures');
export const options = {
  vus: 200,
  duration: '15m',
  thresholds: {
    checks: ['rate>0.98'],
    session_failures: ['rate<0.02'],
    text_to_first_audio_ms: ['p(95)<2000'],
  },
};
export default function () {
  const tokens = JSON.parse(__ENV.TOKENS_JSON || '[]');
  const profile = tokens[__VU - 1];
  if (!profile) throw new Error('Provide 200 distinct staging test profiles/tokens');
  let requested = 0,
    heard = false,
    ready = false,
    failed = false;
  const response = ws.connect(__ENV.GATEWAY_URL, {}, (socket) => {
    socket.on('open', () =>
      socket.send(
        JSON.stringify({
          type: 'hello',
          idToken: profile.idToken,
          childId: profile.childId,
          characterId: 'bhombol',
        }),
      ),
    );
    socket.on('message', (raw) => {
      const message = JSON.parse(raw);
      if (message.type === 'ready' && !ready) {
        ready = true;
        requested = Date.now();
        socket.send(
          JSON.stringify({
            type: 'text',
            text: 'Hello! Tell me one short fact about a bouncing ball.',
          }),
        );
      }
      if (message.type === 'error') failed = true;
    });
    socket.on('binaryMessage', () => {
      if (!heard && requested) {
        heard = true;
        responseAudio.add(Date.now() - requested);
      }
    });
    socket.on('error', () => {
      failed = true;
    });
    socket.setInterval(() => {
      if (ready) socket.sendBinary(new Uint8Array(640).buffer);
    }, 20);
    socket.setTimeout(() => {
      socket.send(JSON.stringify({ type: 'end' }));
      socket.close();
    }, 60000);
  });
  check(response, {
    'upgrade succeeded': (r) => r && r.status === 101,
    'session ready and produced audio': () => ready && heard && !failed,
  });
  failures.add(!ready || !heard || failed);
}
