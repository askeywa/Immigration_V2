import mongoose, { Schema, Document } from 'mongoose';

export interface IFileAsset extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  section?: 'main' | 'spouse' | 'children';
  partName?: string;
  fileName: string;
  mimeType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const FileAssetSchema = new Schema<IFileAsset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    section: { type: String, enum: ['main', 'spouse', 'children'], required: false },
    partName: { type: String },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export const FileAsset = mongoose.models.FileAsset || mongoose.model<IFileAsset>('FileAsset', FileAssetSchema);


