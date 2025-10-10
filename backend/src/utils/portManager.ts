// backend/src/utils/portManager.ts
import net from 'net';

export interface PortConfig {
  preferredPort: number;
  fallbackPorts: number[];
  maxAttempts: number;
  timeout: number;
}

export class PortManager {
  private static defaultConfig: PortConfig = {
    preferredPort: parseInt(process.env.PORT || '5000', 10),
    fallbackPorts: [5001, 5002, 5003, 5004, 5005, 3000, 3001, 8000, 8001],
    maxAttempts: 10,
    timeout: 1000
  };

  /**
   * Check if a port is available
   */
  private static async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => {
          resolve(true);
        });
      });
      
      server.on('error', () => {
        resolve(false);
      });
      
      // Timeout after 1 second
      setTimeout(() => {
        server.close();
        resolve(false);
      }, this.defaultConfig.timeout);
    });
  }

  /**
   * Find an available port from the configuration
   */
  static async findAvailablePort(config?: Partial<PortConfig>): Promise<number> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    console.log(`🔍 Searching for available port starting from ${finalConfig.preferredPort}...`);
    
    // First try the preferred port
    if (await this.isPortAvailable(finalConfig.preferredPort)) {
      console.log(`✅ Preferred port ${finalConfig.preferredPort} is available`);
      return finalConfig.preferredPort;
    }
    
    console.log(`⚠️  Preferred port ${finalConfig.preferredPort} is busy, trying fallback ports...`);
    
    // Try fallback ports
    for (const port of finalConfig.fallbackPorts) {
      if (await this.isPortAvailable(port)) {
        console.log(`✅ Found available fallback port: ${port}`);
        return port;
      }
      console.log(`❌ Port ${port} is busy`);
    }
    
    // If no fallback ports work, try dynamic ports
    console.log(`⚠️  All configured ports are busy, trying dynamic ports...`);
    for (let i = 0; i < finalConfig.maxAttempts; i++) {
      const dynamicPort = Math.floor(Math.random() * 10000) + 10000;
      if (await this.isPortAvailable(dynamicPort)) {
        console.log(`✅ Found available dynamic port: ${dynamicPort}`);
        return dynamicPort;
      }
    }
    
    throw new Error(`❌ Could not find any available port after ${finalConfig.maxAttempts} attempts`);
  }

  /**
   * Get port configuration from environment variables
   */
  static getPortConfig(): PortConfig {
    const fallbackPorts = process.env.FALLBACK_PORTS 
      ? process.env.FALLBACK_PORTS.split(',').map(p => parseInt(p.trim(), 10))
      : this.defaultConfig.fallbackPorts;

    return {
      preferredPort: parseInt(process.env.PORT || '5000', 10),
      fallbackPorts,
      maxAttempts: parseInt(process.env.MAX_PORT_ATTEMPTS || '10', 10),
      timeout: parseInt(process.env.PORT_CHECK_TIMEOUT || '1000', 10)
    };
  }

  /**
   * Start server with intelligent port management
   */
  static async startServerWithPortManagement(
    app: any, 
    config?: Partial<PortConfig>
  ): Promise<{ port: number; server: any }> {
    try {
      const port = await this.findAvailablePort(config);
      
      return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
          console.log(`🚀 Server successfully started on port ${port}`);
          console.log(`🌐 Application URL: http://localhost:${port}`);
          
          // Store port in environment for other processes
          process.env.ACTUAL_PORT = port.toString();
          
          resolve({ port, server });
        });
        
        server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${port} became unavailable during startup`);
            reject(new Error(`Port ${port} is already in use`));
          } else {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }
}

export default PortManager;
