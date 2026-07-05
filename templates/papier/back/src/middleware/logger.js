import morgan from 'morgan';

// Define a concise, safe logging format (no request bodies)
// Example: 127.0.0.1 POST /api/v1/auth/login 200 123 - 5.2 ms "Mozilla/5.0 ..."
export const logger = morgan(':method :url :status :res[content-length] - :response-time ms');

export default logger;
