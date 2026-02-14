const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const payrollRoutes = require('./routes/payroll');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const maxRequestBodySize = process.env.MAX_REQUEST_BODY_SIZE || '15mb';

function parseIntWithDefault(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// Railway is typically one proxy hop away; do not use permissive "true".
const trustProxyHops = parseIntWithDefault(process.env.TRUST_PROXY_HOPS || '1', 1);
app.set('trust proxy', isProduction ? trustProxyHops : false);

// Security middleware with custom CSP for production
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
} else {
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
}

app.use(cors({
  origin: isProduction
    ? process.env.FRONTEND_URL || true
    : 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseIntWithDefault(process.env.RATE_LIMIT_WINDOW_MS || '900000', 900000),
  max: parseIntWithDefault(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 100),
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: maxRequestBodySize }));
app.use(express.urlencoded({ extended: true, limit: maxRequestBodySize }));

// Serve static files from the React app build
if (isProduction) {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// API Routes
app.use('/api/payroll', payrollRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Benedict Payroll Automation API'
  });
});

// Serve React app for all other routes (production only)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: {
      message: error.message || 'Internal server error',
      status: error.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/health`);
});

let isShuttingDown = false;
const shutdown = (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`${signal} received. Closing server gracefully...`);

  server.close((error) => {
    if (error) {
      console.error('Error during server shutdown:', error);
      process.exit(1);
    }

    console.log('Server closed cleanly.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after 10 seconds.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

module.exports = app;
