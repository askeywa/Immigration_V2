// backend/src/scripts/checkStatus.ts
import { ProcessManager } from '../utils/processManager';

async function checkStatus() {
  console.log('📊 Checking server status...\n');

  const isRunning = await ProcessManager.isAnotherInstanceRunning();
  const instanceInfo = ProcessManager.getInstanceInfo();

  if (isRunning) {
    console.log('✅ Server is RUNNING');
    console.log('📊 Instance Info:');
    console.log(`   PID: ${instanceInfo.pid || 'Unknown'}`);
    if (instanceInfo.lockData) {
      console.log(`   Port: ${instanceInfo.lockData.port || 'Unknown'}`);
      console.log(`   Started: ${instanceInfo.lockData.startTime || 'Unknown'}`);
      console.log(`   Age: ${instanceInfo.lockData.timestamp ? Math.round((Date.now() - instanceInfo.lockData.timestamp) / 1000) : 'Unknown'}s`);
    }
  } else {
    console.log('❌ Server is NOT running');
    console.log('💡 Use "npm run dev" or "npm start" to start the server');
  }
}

checkStatus().catch(console.error);
