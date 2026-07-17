import app from './app.js';
import { config } from './config.js';
import { installGracefulShutdown } from './lib/shutdown.js';

const server = app.listen(config.PORT, () => {
  console.log(
    `✅ API Port'ForYou sur :${config.PORT} (payment=${config.PAYMENT_DRIVER}, provisioner=${config.PROVISIONER_DRIVER})`,
  );
});

installGracefulShutdown(server);
