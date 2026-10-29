import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import dotenv from 'dotenv';
import { contractRoutes } from './routes/contracts.js';
import { webhookRoutes } from './routes/webhooks.js';
import { demoRoutes } from './routes/demo.js';

dotenv.config();

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
          }
        : undefined,
  },
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(sensible);

// Register API Routes
await app.register(contractRoutes);
await app.register(webhookRoutes);
await app.register(demoRoutes);

// Health check endpoint
app.get('/health', async () => {
  return {
    status: 'online',
    protocol: 'AgentSLA v1.0',
    paypalMode: process.env.PAYPAL_CLIENT_ID?.includes('mock') ? 'Sandbox Fallback Simulation' : 'Live PayPal Sandbox',
    geminiMode: process.env.GEMINI_API_KEY?.includes('mock') ? 'Sandbox Mock Arbiter' : 'Live Gemini 2.5 Flash',
    timestamp: new Date().toISOString(),
  };
});

const PORT = parseInt(process.env.PORT || '4000', 10);
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`AgentSLA Protocol Core Engine online on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
