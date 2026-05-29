require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSockets } = require('./src/sockets');
const { startLifecycle } = require('./src/sockets/lifecycle');

const PORT = process.env.PORT || 5004;

// Origines autorisées en prod (Socket.IO) : site web + apps natives Capacitor
// (iOS = capacitor://localhost, Android = http://localhost).
const PROD_ORIGINS = [
  process.env.CLIENT_URL,
  'capacitor://localhost',
  'http://localhost',
].filter(Boolean);

const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: PROD_ORIGINS, credentials: true }
  : { origin: true, credentials: true };

const httpServer = http.createServer(app);
initSockets(httpServer, corsOptions);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Allez l'OM ! Serveur lancé sur le port ${PORT}`);
    startLifecycle();
  });
});
