// Database connection re-export for convenience
import { db as storageDb } from './storage.js';

// For development, we'll use the storage module directly
// The storage module will handle the database connection appropriately
export const db = storageDb;