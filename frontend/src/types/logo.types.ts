// frontend/src/types/logo.types.ts

export interface LogoUploadConfig {
  maxFileSize: number; // in bytes
  allowedFormats: string[];
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-100
  generateThumbnails: boolean;
  thumbnailSizes: ThumbnailSize[];
  enableOptimization: boolean;
  watermark?: WatermarkConfig;
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  quality?: number;
}

export interface WatermarkConfig {
  enabled: boolean;
  text?: string;
  imageUrl?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number; // 0-1
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

export interface LogoFile {
  id: string;
  tenantId: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  format: string;
  quality: number;
  isOptimized: boolean;
  thumbnails: LogoThumbnail[];
  metadata: LogoMetadata;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isDefault: boolean;
}

export interface LogoThumbnail {
  id: string;
  logoId: string;
  size: ThumbnailSize;
  fileName: string;
  filePath: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: Date;
}

export interface LogoMetadata {
  exif?: any;
  colorProfile?: string;
  hasTransparency: boolean;
  dominantColors: string[];
  aspectRatio: number;
  compressionRatio: number;
  processingTime: number;
  optimizationLevel: 'none' | 'basic' | 'advanced' | 'maximum';
}

export interface LogoUploadProgress {
  id: string;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'optimizing' | 'generating-thumbnails' | 'completed' | 'error';
  error?: string;
  estimatedTimeRemaining?: number;
  bytesUploaded: number;
  totalBytes: number;
}

export interface LogoUploadResult {
  success: boolean;
  logo?: LogoFile;
  error?: string;
  uploadId: string;
  processingTime: number;
  optimizationStats: OptimizationStats;
}

export interface OptimizationStats {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  qualityLoss: number;
  processingTime: number;
  thumbnailsGenerated: number;
  totalThumbnailSize: number;
}

export interface LogoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface LogoUsageContext {
  header: boolean;
  footer: boolean;
  favicon: boolean;
  email: boolean;
  documents: boolean;
  social: boolean;
  print: boolean;
}

export interface LogoServiceConfig {
  storageProvider: 'local' | 's3' | 'cloudinary' | 'digitalocean';
  storageConfig: any;
  cdnUrl?: string;
  backupEnabled: boolean;
  versioningEnabled: boolean;
  maxVersions: number;
  autoCleanup: boolean;
  cleanupAfterDays: number;
}

export interface LogoContextType {
  // Current logo state
  currentLogo: LogoFile | null;
  availableLogos: LogoFile[];
  uploadProgress: LogoUploadProgress[];
  isLoading: boolean;
  error: string | null;
  
  // Configuration
  config: LogoUploadConfig;
  serviceConfig: LogoServiceConfig;
  
  // Actions
  uploadLogo: (file: File, options?: UploadOptions) => Promise<LogoUploadResult>;
  deleteLogo: (logoId: string) => Promise<void>;
  setActiveLogo: (logoId: string) => Promise<void>;
  updateLogoMetadata: (logoId: string, metadata: Partial<LogoMetadata>) => Promise<void>;
  generateThumbnails: (logoId: string, sizes?: ThumbnailSize[]) => Promise<void>;
  optimizeLogo: (logoId: string, options?: OptimizationOptions) => Promise<void>;
  downloadLogo: (logoId: string, size?: string) => Promise<Blob>;
  getLogoUrl: (logoId: string, size?: string) => string;
  validateLogo: (file: File) => Promise<LogoValidationResult>;
  getUsageContexts: (logoId: string) => Promise<LogoUsageContext>;
  
  // Utilities
  getLogoDimensions: (file: File) => Promise<{ width: number; height: number }>;
  convertFormat: (file: File, targetFormat: string) => Promise<Blob>;
  resizeLogo: (file: File, width: number, height: number) => Promise<Blob>;
  compressLogo: (file: File, quality: number) => Promise<Blob>;
}

export interface UploadOptions {
  generateThumbnails?: boolean;
  optimize?: boolean;
  watermark?: WatermarkConfig;
  preserveAspectRatio?: boolean;
  targetFormat?: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (progress: LogoUploadProgress) => void;
}

export interface OptimizationOptions {
  quality?: number;
  format?: string;
  maxWidth?: number;
  maxHeight?: number;
  preserveAspectRatio?: boolean;
  removeMetadata?: boolean;
  progressive?: boolean;
}

export interface LogoProviderProps {
  children: React.ReactNode;
  tenantId?: string;
  config?: Partial<LogoUploadConfig>;
  serviceConfig?: Partial<LogoServiceConfig>;
}

// Default configurations
export const DEFAULT_LOGO_CONFIG: LogoUploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['png', 'jpg', 'jpeg', 'svg', 'webp'],
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 85,
  generateThumbnails: true,
  thumbnailSizes: [
    { name: 'small', width: 64, height: 64 },
    { name: 'medium', width: 128, height: 128 },
    { name: 'large', width: 256, height: 256 },
    { name: 'xlarge', width: 512, height: 512 },
    { name: 'favicon', width: 32, height: 32 },
    { name: 'apple-touch', width: 180, height: 180 },
  ],
  enableOptimization: true,
  watermark: {
    enabled: false,
    position: 'bottom-right',
    opacity: 0.3,
  },
};

export const DEFAULT_SERVICE_CONFIG: LogoServiceConfig = {
  storageProvider: 'local',
  storageConfig: {},
  backupEnabled: true,
  versioningEnabled: true,
  maxVersions: 5,
  autoCleanup: true,
  cleanupAfterDays: 30,
};

// Logo size presets for different use cases
export const LOGO_SIZE_PRESETS = {
  favicon: { width: 32, height: 32, quality: 100 },
  header: { width: 200, height: 60, quality: 90 },
  footer: { width: 150, height: 45, quality: 85 },
  email: { width: 300, height: 90, quality: 85 },
  social: { width: 400, height: 400, quality: 90 },
  print: { width: 800, height: 240, quality: 95 },
  document: { width: 400, height: 120, quality: 90 },
  app: { width: 512, height: 512, quality: 90 },
} as const;

export type LogoSizePreset = keyof typeof LOGO_SIZE_PRESETS;
