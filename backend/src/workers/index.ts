/**
 * Workers Entry Point
 * Starts all background workers for the system
 */

import { startWorker } from './tripwire-worker';

async function main() {
  console.log('🚀 Starting all workers...');
  
  try {
    // Start Tripwire Worker
    await startWorker();
    
    console.log('✅ All workers started successfully');
    
    // Keep the process running
    process.on('SIGTERM', async () => {
      console.log('📍 Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('📍 Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  }
}

main();
