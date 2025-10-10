// backend/src/scripts/forceCleanup.ts
import { ProcessManager } from '../utils/processManager';

console.log('🧹 Force cleaning up all server lock files...');
ProcessManager.forceCleanup();
console.log('✅ Cleanup completed! You can now start a new server instance.');
