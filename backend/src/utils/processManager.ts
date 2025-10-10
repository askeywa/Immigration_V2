// backend/src/utils/processManager.ts
import fs from 'fs';
import path from 'path';
import { log } from '../config/logging';

export class ProcessManager {
  private static readonly PID_FILE = path.join(process.cwd(), '.server.pid');
  private static readonly LOCK_FILE = path.join(process.cwd(), '.server.lock');

  /**
   * Check if another instance is already running
   */
  static async isAnotherInstanceRunning(): Promise<boolean> {
    try {
      // Check PID file
      if (fs.existsSync(this.PID_FILE)) {
        const pid = parseInt(fs.readFileSync(this.PID_FILE, 'utf8').trim(), 10);
        
        try {
          // Try to send signal 0 to check if process exists
          process.kill(pid, 0);
          console.log(`⚠️  Another server instance is already running with PID: ${pid}`);
          return true;
        } catch (error) {
          // Process doesn't exist, remove stale PID file
          console.log(`🧹 Removing stale PID file for non-existent process: ${pid}`);
          this.cleanupPidFile();
        }
      }

      // Check lock file
      if (fs.existsSync(this.LOCK_FILE)) {
        const lockData = JSON.parse(fs.readFileSync(this.LOCK_FILE, 'utf8'));
        const now = Date.now();
        const lockAge = now - lockData.timestamp;
        
        // If lock is older than 30 seconds, consider it stale
        if (lockAge > 30000) {
          console.log(`🧹 Removing stale lock file (age: ${lockAge}ms)`);
          this.cleanupLockFile();
        } else {
          console.log(`⚠️  Another server instance has a recent lock file`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking for existing instances:', error);
      return false;
    }
  }

  /**
   * Create PID and lock files
   */
  static async createInstanceLock(): Promise<void> {
    try {
      const lockData = {
        pid: process.pid,
        timestamp: Date.now(),
        port: process.env.PORT || '5000',
        startTime: new Date().toISOString()
      };

      // Create PID file
      fs.writeFileSync(this.PID_FILE, process.pid.toString());
      
      // Create lock file with metadata
      fs.writeFileSync(this.LOCK_FILE, JSON.stringify(lockData, null, 2));
      
      console.log(`✅ Created instance lock - PID: ${process.pid}`);
      
      // Setup cleanup on process exit
      this.setupCleanupHandlers();
      
    } catch (error) {
      console.error('❌ Failed to create instance lock:', error);
      throw error;
    }
  }

  /**
   * Clean up PID and lock files
   */
  static cleanupPidFile(): void {
    try {
      if (fs.existsSync(this.PID_FILE)) {
        fs.unlinkSync(this.PID_FILE);
        console.log('🧹 Cleaned up PID file');
      }
    } catch (error) {
      console.error('❌ Error cleaning up PID file:', error);
    }
  }

  static cleanupLockFile(): void {
    try {
      if (fs.existsSync(this.LOCK_FILE)) {
        fs.unlinkSync(this.LOCK_FILE);
        console.log('🧹 Cleaned up lock file');
      }
    } catch (error) {
      console.error('❌ Error cleaning up lock file:', error);
    }
  }

  /**
   * Setup cleanup handlers for graceful shutdown
   */
  private static setupCleanupHandlers(): void {
    const cleanup = () => {
      console.log('🛑 Shutting down server gracefully...');
      this.cleanupPidFile();
      this.cleanupLockFile();
      process.exit(0);
    };

    // Handle different exit signals
    process.on('SIGINT', cleanup);   // Ctrl+C
    process.on('SIGTERM', cleanup);  // Termination signal
    process.on('SIGUSR2', cleanup);  // Nodemon restart
    process.on('exit', () => {
      this.cleanupPidFile();
      this.cleanupLockFile();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      cleanup();
    });

    process.on('unhandledRejection', (reason) => {
      console.error('❌ Unhandled Rejection:', reason);
      cleanup();
    });
  }

  /**
   * Get information about running instances
   */
  static getInstanceInfo(): { pid?: number; lockData?: any } {
    const info: { pid?: number; lockData?: any } = {};

    try {
      if (fs.existsSync(this.PID_FILE)) {
        info.pid = parseInt(fs.readFileSync(this.PID_FILE, 'utf8').trim(), 10);
      }

      if (fs.existsSync(this.LOCK_FILE)) {
        info.lockData = JSON.parse(fs.readFileSync(this.LOCK_FILE, 'utf8'));
      }
    } catch (error) {
      console.error('❌ Error reading instance info:', error);
    }

    return info;
  }

  /**
   * Force cleanup of all lock files (use with caution)
   */
  static forceCleanup(): void {
    console.log('🧹 Force cleaning up all lock files...');
    this.cleanupPidFile();
    this.cleanupLockFile();
  }
}

export default ProcessManager;
