import { SCENARIOS, startFakeGateway } from '../src/fake-gateway';

const port = Number(process.env['PORT'] ?? 8787);
const gateway = await startFakeGateway({
  port,
  scenario: SCENARIOS.jellyDragon,
  tone: process.env['TONE'] === '1',
});
console.log(`fake gateway listening on ${gateway.url}`);
const shutdown = (): void => {
  void gateway.close().then(() => process.exit(0));
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
