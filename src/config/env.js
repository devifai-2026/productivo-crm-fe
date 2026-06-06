const isProd = true;

export const API_BASE_URL = isProd
  ? 'https://www.productivo.in/api/v1'
  : 'http://localhost:3001/api/v1';

// Socket.io server = API base without the /api/v1 path
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export { isProd };
