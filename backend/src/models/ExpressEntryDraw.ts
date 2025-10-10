import mongoose, { Schema, Document } from 'mongoose';

export interface IExpressEntryDraw extends Document {
  score: number;
  date: string; // ISO string (YYYY-MM-DD)
  notes?: string;
  updatedBy?: string; // user id
  updatedAt: Date;
}

const expressEntryDrawSchema = new Schema<IExpressEntryDraw>({
  score: { type: Number, required: true, min: 0 },
  date: { type: String, required: true },
  notes: { type: String },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'express_entry_draw', timestamps: { createdAt: false, updatedAt: 'updatedAt' } });

// Only a single document is expected; we'll always use findOne/updateOne
export const ExpressEntryDraw = mongoose.models.ExpressEntryDraw || mongoose.model<IExpressEntryDraw>('ExpressEntryDraw', expressEntryDrawSchema);

export default ExpressEntryDraw;


