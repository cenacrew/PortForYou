import type { Server } from 'node:http';

/**
 * Arrêt gracieux pour Cloud Run : à réception de SIGTERM (envoyé ~10 s avant le
 * SIGKILL), on cesse d'accepter de nouvelles connexions et on laisse les requêtes
 * en vol se terminer avant de sortir. Un filet de sécurité force la sortie si le
 * drain traîne, pour ne pas être tué brutalement par la plateforme.
 */
export function installGracefulShutdown(server: Server, timeoutMs = 8000): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`↩️  ${signal} reçu — arrêt gracieux (drain des requêtes en vol)…`);

    const forced = setTimeout(() => {
      console.error('⏱️  Drain trop long, sortie forcée.');
      process.exit(1);
    }, timeoutMs);
    // Ne pas maintenir le process en vie juste pour ce timer.
    forced.unref();

    server.close((err) => {
      clearTimeout(forced);
      if (err) {
        console.error('Erreur pendant server.close:', err);
        process.exit(1);
      }
      console.log('✅ Serveur fermé proprement.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
