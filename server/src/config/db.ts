import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';
let isConnected = false;
let lastConnectionError: string | null = null;
function sanitizeMongoUri(uri: string) {
  try {
    const parsed = new URL(uri);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return uri.replace(/\/\/([^:/?#]+):([^@]+)@/, '//***:***@');
  }
}
export async function connectDatabase() {
  if (isConnected) return;

  mongoose.connection.on('connected', () => {
    isConnected = true;
    lastConnectionError = null;
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (error) => {
    isConnected = false;
    lastConnectionError = error.message;
    logger.error('MongoDB connection error', { error: error.message });
  });

  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName,
    maxPoolSize: env.mongoMaxPoolSize,
    minPoolSize: env.mongoMinPoolSize,
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
    socketTimeoutMS: env.mongoSocketTimeoutMs,
  });

  isConnected = true;
  logger.info('MongoDB connected', { uri: sanitizeMongoUri(env.mongoUri) });
}

export function getDatabaseHealth() {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    error: lastConnectionError,
  };
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
  isConnected = false;
}
