// backend/src/models/Theme.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITheme extends Document {
  tenantId: string;
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  accent: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: {
      primary: string;
      secondary: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      linear: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
  branding: {
    companyName: string;
    logoUrl?: string;
    faviconUrl?: string;
    customCSS?: string;
  };
  metadata: {
    name: string;
    version: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

const ColorSchema = new Schema({
  main: { type: String, required: true },
  light: { type: String, required: true },
  dark: { type: String, required: true },
  contrast: { type: String, required: true }
}, { _id: false });

const BackgroundSchema = new Schema({
  primary: { type: String, required: true },
  secondary: { type: String, required: true },
  tertiary: { type: String, required: true }
}, { _id: false });

const TextSchema = new Schema({
  primary: { type: String, required: true },
  secondary: { type: String, required: true },
  tertiary: { type: String, required: true }
}, { _id: false });

const BorderSchema = new Schema({
  primary: { type: String, required: true },
  secondary: { type: String, required: true },
  tertiary: { type: String, required: true }
}, { _id: false });

const SpacingSchema = new Schema({
  xs: { type: String, required: true },
  sm: { type: String, required: true },
  md: { type: String, required: true },
  lg: { type: String, required: true },
  xl: { type: String, required: true }
}, { _id: false });

const FontFamilySchema = new Schema({
  primary: { type: String, required: true },
  secondary: { type: String, required: true },
  mono: { type: String, required: true }
}, { _id: false });

const FontSizeSchema = new Schema({
  xs: { type: String, required: true },
  sm: { type: String, required: true },
  base: { type: String, required: true },
  lg: { type: String, required: true },
  xl: { type: String, required: true },
  '2xl': { type: String, required: true },
  '3xl': { type: String, required: true }
}, { _id: false });

const FontWeightSchema = new Schema({
  normal: { type: String, required: true },
  medium: { type: String, required: true },
  semibold: { type: String, required: true },
  bold: { type: String, required: true }
}, { _id: false });

const TypographySchema = new Schema({
  fontFamily: FontFamilySchema,
  fontSize: FontSizeSchema,
  fontWeight: FontWeightSchema
}, { _id: false });

const BorderRadiusSchema = new Schema({
  none: { type: String, required: true },
  sm: { type: String, required: true },
  md: { type: String, required: true },
  lg: { type: String, required: true },
  xl: { type: String, required: true },
  full: { type: String, required: true }
}, { _id: false });

const ShadowSchema = new Schema({
  sm: { type: String, required: true },
  md: { type: String, required: true },
  lg: { type: String, required: true },
  xl: { type: String, required: true }
}, { _id: false });

const AnimationDurationSchema = new Schema({
  fast: { type: String, required: true },
  normal: { type: String, required: true },
  slow: { type: String, required: true }
}, { _id: false });

const AnimationEasingSchema = new Schema({
  linear: { type: String, required: true },
  easeIn: { type: String, required: true },
  easeOut: { type: String, required: true },
  easeInOut: { type: String, required: true }
}, { _id: false });

const AnimationSchema = new Schema({
  duration: AnimationDurationSchema,
  easing: AnimationEasingSchema
}, { _id: false });

const BrandingSchema = new Schema({
  companyName: { type: String, required: true },
  logoUrl: { type: String, default: '' },
  faviconUrl: { type: String, default: '' },
  customCSS: { type: String, default: '' }
}, { _id: false });

const MetadataSchema = new Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const ThemeSchema = new Schema({
  tenantId: { 
    type: String, 
    required: true
  },
  primary: ColorSchema,
  secondary: ColorSchema,
  accent: ColorSchema,
  background: BackgroundSchema,
  text: TextSchema,
  border: BorderSchema,
  spacing: SpacingSchema,
  typography: TypographySchema,
  borderRadius: BorderRadiusSchema,
  shadow: ShadowSchema,
  animation: AnimationSchema,
  branding: BrandingSchema,
  metadata: MetadataSchema
}, {
  timestamps: true,
  collection: 'themes'
});

// Ensure only one theme per tenant (this also handles efficient tenant-based queries)
ThemeSchema.index({ tenantId: 1 }, { unique: true });

export const Theme = mongoose.model<ITheme>('Theme', ThemeSchema);
