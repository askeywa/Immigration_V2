// frontend/src/utils/helpers.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDateDDMMYYYY } from './date';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | Date) => formatDateDDMMYYYY(date);

export const formatDateTime = (date: string | Date) => {
  const base = formatDateDDMMYYYY(date);
  if (!base) return '';
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${base} ${hh}:${mm}`;
};