// frontend/src/services/logoService.ts

import { 
  LogoFile, 
  LogoUploadConfig, 
  LogoServiceConfig, 
  LogoUploadResult, 
  LogoUploadProgress,
  LogoValidationResult,
  OptimizationStats,
  ThumbnailSize,
  WatermarkConfig,
  UploadOptions,
  OptimizationOptions,
  DEFAULT_LOGO_CONFIG,
  DEFAULT_SERVICE_CONFIG,
  LOGO_SIZE_PRESETS
} from '@/types/logo.types';
import { tenantAwareApi } from './api';

export class LogoService {
  private static instance: LogoService;
  private config: LogoUploadConfig;
  private serviceConfig: LogoServiceConfig;
  private uploadProgress: Map<string, LogoUploadProgress> = new Map();

  private constructor() {
    this.config = DEFAULT_LOGO_CONFIG;
    this.serviceConfig = DEFAULT_SERVICE_CONFIG;
  }

  public static getInstance(): LogoService {
    if (!LogoService.instance) {
      LogoService.instance = new LogoService();
    }
    return LogoService.instance;
  }

  /**
   * Upload a logo file with optimization
   */
  public async uploadLogo(
    file: File, 
    tenantId: string,
    options: UploadOptions = {}
  ): Promise<LogoUploadResult> {
    const uploadId = this.generateUploadId();
    
    try {
      // Validate file
      const validation = await this.validateLogo(file);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Initialize progress tracking
      const progress: LogoUploadProgress = {
        id: uploadId,
        fileName: file.name,
        progress: 0,
        status: 'uploading',
        bytesUploaded: 0,
        totalBytes: file.size,
      };
      this.uploadProgress.set(uploadId, progress);

      // Update progress
      this.updateProgress(uploadId, 10, 'uploading');
      options.onProgress?.(progress);

      // Create form data
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('tenantId', tenantId);
      formData.append('options', JSON.stringify(options));

      // Upload file
      this.updateProgress(uploadId, 30, 'uploading');
      const uploadResponse = await tenantAwareApi.post('/logos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Tenant-ID': tenantId,
        },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
          this.updateProgress(uploadId, 30 + (percentCompleted * 0.4), 'uploading');
          options.onProgress?.(this.uploadProgress.get(uploadId)!);
        },
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.error || 'Upload failed');
      }

      this.updateProgress(uploadId, 70, 'processing');
      options.onProgress?.(this.uploadProgress.get(uploadId)!);

      // Process and optimize
      const processResponse = await tenantAwareApi.post('/logos/process', {
        uploadId: uploadResponse.data.uploadId,
        tenantId,
        options,
      }, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!processResponse.data.success) {
        throw new Error(processResponse.data.error || 'Processing failed');
      }

      this.updateProgress(uploadId, 100, 'completed');
      options.onProgress?.(this.uploadProgress.get(uploadId)!);

      const result: LogoUploadResult = {
        success: true,
        logo: processResponse.data.logo,
        uploadId,
        processingTime: processResponse.data.processingTime,
        optimizationStats: processResponse.data.optimizationStats,
      };

      // Clean up progress tracking
      this.uploadProgress.delete(uploadId);

      return result;

    } catch (error) {
      this.updateProgress(uploadId, 0, 'error', error instanceof Error ? error.message : 'Upload failed');
      options.onProgress?.(this.uploadProgress.get(uploadId)!);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        uploadId,
        processingTime: 0,
        optimizationStats: {
          originalSize: file.size,
          optimizedSize: 0,
          compressionRatio: 0,
          qualityLoss: 0,
          processingTime: 0,
          thumbnailsGenerated: 0,
          totalThumbnailSize: 0,
        },
      };
    }
  }

  /**
   * Get current logo for tenant
   */
  public async getCurrentLogo(tenantId: string): Promise<LogoFile | null> {
    try {
      const response = await tenantAwareApi.get(`/logos/current`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      return response.data.success ? response.data.logo : null;
    } catch (error) {
      console.error('Failed to get current logo:', error);
      return null;
    }
  }

  /**
   * Get all logos for tenant
   */
  public async getTenantLogos(tenantId: string): Promise<LogoFile[]> {
    try {
      const response = await tenantAwareApi.get(`/logos/tenant/${tenantId}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      return response.data.success ? response.data.logos : [];
    } catch (error) {
      console.error('Failed to get tenant logos:', error);
      return [];
    }
  }

  /**
   * Set active logo
   */
  public async setActiveLogo(logoId: string, tenantId: string): Promise<void> {
    try {
      await tenantAwareApi.post('/logos/set-active', {
        logoId,
        tenantId,
      }, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
    } catch (error) {
      console.error('Failed to set active logo:', error);
      throw error;
    }
  }

  /**
   * Delete logo
   */
  public async deleteLogo(logoId: string, tenantId: string): Promise<void> {
    try {
      await tenantAwareApi.delete(`/api/logos/${logoId}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
    } catch (error) {
      console.error('Failed to delete logo:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnails for logo
   */
  public async generateThumbnails(logoId: string, tenantId: string, sizes?: ThumbnailSize[]): Promise<void> {
    try {
      await tenantAwareApi.post('/logos/generate-thumbnails', {
        logoId,
        sizes: sizes || this.config.thumbnailSizes,
      }, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
      throw error;
    }
  }

  /**
   * Optimize logo
   */
  public async optimizeLogo(logoId: string, tenantId: string, options?: OptimizationOptions): Promise<void> {
    try {
      await tenantAwareApi.post('/logos/optimize', {
        logoId,
        options: options || {},
      }, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
    } catch (error) {
      console.error('Failed to optimize logo:', error);
      throw error;
    }
  }

  /**
   * Get logo URL
   */
  public getLogoUrl(logoId: string, size?: string, tenantId?: string): string {
    const baseUrl = this.serviceConfig.cdnUrl || '/api/logos';
    const sizeParam = size ? `?size=${size}` : '';
    const tenantParam = tenantId ? `&tenantId=${tenantId}` : '';
    return `${baseUrl}/${logoId}${sizeParam}${tenantParam}`;
  }

  /**
   * Download logo
   */
  public async downloadLogo(logoId: string, size?: string, tenantId?: string): Promise<Blob> {
    try {
      const url = this.getLogoUrl(logoId, size, tenantId);
      const response = await fetch(url, {
        headers: {
          'X-Tenant-ID': tenantId || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download logo');
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to download logo:', error);
      throw error;
    }
  }

  /**
   * Validate logo file
   */
  public async validateLogo(file: File): Promise<LogoValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check file size
    if (file.size > this.config.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize)}`);
    }

    // Check file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !this.config.allowedFormats.includes(fileExtension)) {
      errors.push(`File format not supported. Allowed formats: ${this.config.allowedFormats.join(', ')}`);
    }

    // Check MIME type
    const allowedMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/svg+xml',
      'image/webp',
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      errors.push(`Invalid file type: ${file.type}`);
    }

    // Get image dimensions
    try {
      const dimensions = await this.getImageDimensions(file);
      
      // Check dimensions
      if (dimensions.width > this.config.maxWidth) {
        errors.push(`Image width (${dimensions.width}px) exceeds maximum allowed width (${this.config.maxWidth}px)`);
      }
      
      if (dimensions.height > this.config.maxHeight) {
        errors.push(`Image height (${dimensions.height}px) exceeds maximum allowed height (${this.config.maxHeight}px)`);
      }

      // Check aspect ratio
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio < 0.5 || aspectRatio > 3) {
        warnings.push('Unusual aspect ratio detected. Consider using a more standard logo format.');
      }

      // Check if image is too small
      if (dimensions.width < 64 || dimensions.height < 64) {
        warnings.push('Image is quite small. Consider using a higher resolution for better quality.');
      }

      // Check if image is too large
      if (dimensions.width > 1000 || dimensions.height > 1000) {
        suggestions.push('Large image detected. Optimization will be applied to reduce file size.');
      }

    } catch (error) {
      errors.push('Failed to read image dimensions. File may be corrupted.');
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push('File name is too long. Please use a shorter name.');
    }

    // Check for special characters in filename
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.name)) {
      errors.push('File name contains invalid characters.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Get image dimensions
   */
  public async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve: any, reject: any) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Convert image format
   */
  public async convertImageFormat(file: File, targetFormat: string, quality: number = 0.9): Promise<Blob> {
    return new Promise((resolve: any, reject: any) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob: any) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image'));
            }
          },
          `image/${targetFormat}`,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Resize image
   */
  public async resizeImage(
    file: File, 
    width: number, 
    height: number, 
    quality: number = 0.9
  ): Promise<Blob> {
    return new Promise((resolve: any, reject: any) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const url = URL.createObjectURL(file);

      canvas.width = width;
      canvas.height = height;

      img.onload = () => {
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob: any) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Compress image
   */
  public async compressImage(file: File, quality: number): Promise<Blob> {
    return new Promise((resolve: any, reject: any) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob: any) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Get logo size preset
   */
  public getSizePreset(preset: keyof typeof LOGO_SIZE_PRESETS) {
    return LOGO_SIZE_PRESETS[preset];
  }

  /**
   * Update upload progress
   */
  private updateProgress(
    uploadId: string, 
    progress: number, 
    status: LogoUploadProgress['status'],
    error?: string
  ): void {
    const currentProgress = this.uploadProgress.get(uploadId);
    if (currentProgress) {
      currentProgress.progress = progress;
      currentProgress.status = status;
      if (error) {
        currentProgress.error = error;
      }
      this.uploadProgress.set(uploadId, currentProgress);
    }
  }

  /**
   * Generate unique upload ID
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get upload progress
   */
  public getUploadProgress(uploadId: string): LogoUploadProgress | undefined {
    return this.uploadProgress.get(uploadId);
  }

  /**
   * Clear upload progress
   */
  public clearUploadProgress(uploadId: string): void {
    this.uploadProgress.delete(uploadId);
  }

  /**
   * Get all upload progress
   */
  public getAllUploadProgress(): LogoUploadProgress[] {
    return Array.from(this.uploadProgress.values());
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LogoUploadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update service configuration
   */
  public updateServiceConfig(config: Partial<LogoServiceConfig>): void {
    this.serviceConfig = { ...this.serviceConfig, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): LogoUploadConfig {
    return this.config;
  }

  /**
   * Get service configuration
   */
  public getServiceConfig(): LogoServiceConfig {
    return this.serviceConfig;
  }
}

// Export singleton instance
export const logoService = LogoService.getInstance();
