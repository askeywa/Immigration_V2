// backend/src/utils/lightweightMonitoring.ts
// Lightweight memory monitoring replacement for heavy monitoring services

export class LightweightMonitoring {
  private static logMemoryUsage(): void {
    const used = process.memoryUsage();
    const memoryMB = Math.round(used.heapUsed / 1024 / 1024);
    const rssMB = Math.round(used.rss / 1024 / 1024);
    
    if (memoryMB > 400) { // Alert if over 400MB
      console.warn(`🚨 HIGH MEMORY USAGE: ${memoryMB}MB heap, ${rssMB}MB RSS`);
    } else if (memoryMB > 300) {
      console.log(`⚠️  Memory usage: ${memoryMB}MB heap, ${rssMB}MB RSS`);
    } else {
      console.log(`📊 Memory usage: ${memoryMB}MB heap, ${rssMB}MB RSS`);
    }
  }
  
  static initialize(): void {
    console.log('🔧 Lightweight monitoring initialized');
    
    // Log memory every 5 minutes
    setInterval(this.logMemoryUsage, 5 * 60 * 1000);
    
    // Log initial memory usage
    this.logMemoryUsage();
  }
}
