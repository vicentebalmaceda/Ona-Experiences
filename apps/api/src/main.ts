import { env } from './config/env.js';
import { createApp } from './interfaces/http/app.js';
import { createLogger } from './shared/logger.js';

const log = createLogger('server');
const app = createApp();

app.listen(env.PORT, () => {
  log.info('ONA API started', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL
  });
});
