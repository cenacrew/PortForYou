import app from './app.js';
import { config } from './config.js';

app.listen(config.PORT, () => {
  console.log(
    `✅ API Port'ForYou sur :${config.PORT} (payment=${config.PAYMENT_DRIVER}, provisioner=${config.PROVISIONER_DRIVER})`,
  );
});
