const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const DEFAULT_CODE = `// Sample function used for interview practice
function greet(name) {
  return 'Hello, ' + name + '!';
}

console.log(greet('World'));`;

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

const sessions = new Map(); // sessionId -> { code, language, lastUpdated }

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.post('/api/sessions', (req, res) => {
  const { code, language } = req.body || {};
  const sessionId = crypto.randomUUID();

  sessions.set(sessionId, {
    code: typeof code === 'string' ? code : DEFAULT_CODE,
    language: typeof language === 'string' ? language : 'javascript',
    lastUpdated: Date.now(),
  });

  res.status(201).json({ sessionId });
});

app.get('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  res.json({ sessionId: req.params.id, ...session });
});

const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.on('join-session', ({ sessionId }) => {
    if (!sessionId) return;

    const existing = sessions.get(sessionId);
    if (!existing) {
      sessions.set(sessionId, {
        code: DEFAULT_CODE,
        language: 'javascript',
        lastUpdated: Date.now(),
      });
    }

    socket.join(sessionId);
    const session = sessions.get(sessionId);
    socket.emit('session-state', session);
  });

  socket.on('code-update', ({ sessionId, code, language }) => {
    if (!sessionId) return;
    const session = sessions.get(sessionId);
    if (!session) return;

    const sanitizedLanguage = typeof language === 'string' ? language : session.language;
    const sanitizedCode = typeof code === 'string' ? code : session.code;

    session.code = sanitizedCode;
    session.language = sanitizedLanguage;
    session.lastUpdated = Date.now();
    sessions.set(sessionId, session);

    socket.to(sessionId).emit('code-update', {
      code: sanitizedCode,
      language: sanitizedLanguage,
    });
  });

  socket.on('broadcast-run', ({ sessionId, output }) => {
    if (!sessionId || typeof output !== 'string') return;
    socket.to(sessionId).emit('run-result', { output });
  });
});

if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, httpServer, io, sessions };
