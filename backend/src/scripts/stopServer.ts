// backend/src/scripts/stopServer.ts
import { ProcessManager } from '../utils/processManager';

console.log('🛑 Stopping server...\n');

const instanceInfo = ProcessManager.getInstanceInfo();

if (instanceInfo.pid) {
  try {
    console.log(`📤 Sending SIGTERM to process ${instanceInfo.pid}...`);
    process.kill(instanceInfo.pid, 'SIGTERM');
    
    // Wait a moment for graceful shutdown
    setTimeout(() => {
      try {
        // Check if process is still running
        process.kill(instanceInfo.pid!, 0);
        console.log('⚠️  Process still running, sending SIGKILL...');
        process.kill(instanceInfo.pid!, 'SIGKILL');
      } catch (error) {
        // Process already terminated
      }
      
      // Clean up lock files
      ProcessManager.forceCleanup();
      console.log('✅ Server stopped successfully!');
    }, 2000);
    
  } catch (error) {
    console.log('❌ Failed to stop server:', error);
    console.log('🧹 Cleaning up lock files anyway...');
    ProcessManager.forceCleanup();
  }
} else {
  console.log('⚠️  No running server instance found');
  console.log('🧹 Cleaning up any stale lock files...');
  ProcessManager.forceCleanup();
}
