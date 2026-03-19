import { createApp } from './http/app.js';
import { env } from './config/env.js';

createApp().listen(env.port, () => {
  console.log(`ledger-signer-service listening on port ${env.port}`);
});
