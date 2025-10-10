// backend/src/services/lazyServiceManager.ts
import { log } from '../utils/logger';

interface LazyService {
  name: string;
  init: () => Promise<void> | void;
  critical: boolean;
  loaded: boolean;
}

class LazyServiceManager {
  private static instance: LazyServiceManager;
  private services: LazyService[] = [];
  private initialized = false;

  private constructor() {}

  static getInstance(): LazyServiceManager {
    if (!LazyServiceManager.instance) {
      LazyServiceManager.instance = new LazyServiceManager();
    }
    return LazyServiceManager.instance;
  }

  /**
   * Register a service to be loaded lazily
   */
  registerService(service: Omit<LazyService, 'loaded'>): void {
    this.services.push({
      ...service,
      loaded: false
    });
  }

  /**
   * Initialize all non-critical services after server startup
   */
  async initializeNonCriticalServices(): Promise<void> {
    if (this.initialized) {
      return;
    }

    log.info('🔄 Starting lazy initialization of non-critical services...');
    const startTime = Date.now();

    const nonCriticalServices = this.services.filter(service => !service.critical);
    
    // Initialize services in parallel for faster startup
    const initPromises = nonCriticalServices.map(async (service) => {
      try {
        await service.init();
        service.loaded = true;
        log.info(`✅ ${service.name} initialized (lazy)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.warn(`⚠️  ${service.name} failed to initialize (lazy)`, { error: errorMessage });
      }
    });

    await Promise.allSettled(initPromises);
    
    const initTime = Date.now() - startTime;
    const loadedCount = this.services.filter(s => s.loaded).length;
    
    log.info(`✅ Lazy service initialization completed`, {
      totalServices: this.services.length,
      loadedServices: loadedCount,
      initTime: `${initTime}ms`
    });

    this.initialized = true;
  }

  /**
   * Initialize critical services immediately
   */
  async initializeCriticalServices(): Promise<void> {
    const criticalServices = this.services.filter(service => service.critical);
    
    for (const service of criticalServices) {
      try {
        await service.init();
        service.loaded = true;
        log.info(`✅ ${service.name} initialized (critical)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`❌ ${service.name} failed to initialize (CRITICAL)`, { error: errorMessage });
        throw error;
      }
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(): { name: string; loaded: boolean; critical: boolean }[] {
    return this.services.map(service => ({
      name: service.name,
      loaded: service.loaded,
      critical: service.critical
    }));
  }

  /**
   * Check if all services are loaded
   */
  areAllServicesLoaded(): boolean {
    return this.services.every(service => service.loaded);
  }
}

export default LazyServiceManager;
