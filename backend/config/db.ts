import mongoose from 'mongoose';
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

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/score-wala';
  const maxPoolSize = Number(process.env.MONGO_MAX_POOL_SIZE || 50);
  const minPoolSize = Number(process.env.MONGO_MIN_POOL_SIZE || 5);
  const serverSelectionTimeoutMS = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000);
  const socketTimeoutMS = Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000);

  mongoose.connection.on('connected', () => {
    isConnected = true;
    lastConnectionError = null;
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
  });

  mongoose.connection.on('error', (error) => {
    isConnected = false;
    lastConnectionError = error.message;
    console.error('MongoDB connection error:', error.message);
  });

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGO_DB_NAME || undefined,
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS,
    socketTimeoutMS,
  });

  isConnected = true;
  console.log(`MongoDB connected: ${sanitizeMongoUri(mongoUri)}`);
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
