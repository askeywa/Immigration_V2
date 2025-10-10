import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { FileAsset } from '../models/FileAsset';

const router = Router();

// Upload file (base64 payload)
router.post('/upload', authenticate, asyncHandler(async (req: any, res) => {
  const userId = (req as any).user?.id;
  const { title, section, partName, fileName, mimeType, base64 } = (req as any).body || {};
  if (!title || !fileName || !mimeType || !base64) return (res as any).status(400).json({ message: 'Missing fields' });
  const buffer = Buffer.from(base64, 'base64');
  const saved = await FileAsset.create({ userId, title, section, partName, fileName, mimeType, size: buffer.length, data: buffer });
  return (res as any).status(201).json({ data: { id: saved._id, title: saved.title, fileName: saved.fileName, mimeType: saved.mimeType, size: saved.size } });
}));

// List files for a user
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const userId = (req as any).user?.id;
  const files = await FileAsset.find({ userId }).select('_id title fileName mimeType size section partName createdAt');
  return (res as any).json({ data: files });
}));

// Admin: list files for a given user
router.get('/user/:userId', authenticate, asyncHandler(async (req: any, res) => {
  const files = await FileAsset.find({ userId: (req as any).params.userId }).select('_id title fileName mimeType size section partName createdAt');
  return (res as any).json({ data: files });
}));

// Download by id
router.get('/download/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const asset = await FileAsset.findById((req as any).params.id);
  if (!asset) return (res as any).status(404).json({ message: 'Not found' });
  (res as any).setHeader('Content-Type', asset.mimeType);
  (res as any).setHeader('Content-Disposition', `attachment; filename="${asset.fileName}"`);
  return (res as any).send(asset.data);
}));

// Delete
router.delete('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const userId = (req as any).user?.id;
  const file = await FileAsset.findById((req as any).params.id);
  if (!file) return (res as any).status(404).json({ message: 'Not found' });
  if (String(file.userId) !== String(userId)) return (res as any).status(403).json({ message: 'Forbidden' });
  await file.deleteOne();
  return (res as any).json({ success: true });
}));

// Update title
router.patch('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const userId = (req as any).user?.id;
  const { title } = (req as any).body || {};
  if (!title) return (res as any).status(400).json({ message: 'Title required' });
  const file = await FileAsset.findById((req as any).params.id);
  if (!file) return (res as any).status(404).json({ message: 'Not found' });
  if (String(file.userId) !== String(userId)) return (res as any).status(403).json({ message: 'Forbidden' });
  file.title = title;
  await file.save();
  return (res as any).json({ success: true });
}));

export default router;


