import morgan from 'morgan';

// Expose l'ID de corrélation (posé par le middleware requestId) dans les logs.
morgan.token('id', (req) => (req as { requestId?: string }).requestId ?? '-');

// Define a concise, safe logging format (no request bodies)
// Example: <req-id> POST /api/v1/auth/login 200 123 - 5.2 ms
export const logger = morgan(':id :method :url :status :res[content-length] - :response-time ms');

export default logger;
