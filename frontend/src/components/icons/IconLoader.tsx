// Optimized icon loader with dynamic imports
import React, { Suspense, lazy } from 'react';

// Icon mapping for dynamic loading
const iconMap = {
  // Common icons
  'eye': () => import('@heroicons/react/24/outline').then(m => ({ default: m.EyeIcon })),
  'cog': () => import('@heroicons/react/24/outline').then(m => ({ default: m.CogIcon })),
  'trash': () => import('@heroicons/react/24/outline').then(m => ({ default: m.TrashIcon })),
  'play': () => import('@heroicons/react/24/outline').then(m => ({ default: m.PlayIcon })),
  'pause': () => import('@heroicons/react/24/outline').then(m => ({ default: m.PauseIcon })),
  'x-mark': () => import('@heroicons/react/24/outline').then(m => ({ default: m.XMarkIcon })),
  'user': () => import('@heroicons/react/24/outline').then(m => ({ default: m.UserIcon })),
  'calendar': () => import('@heroicons/react/24/outline').then(m => ({ default: m.CalendarIcon })),
  'credit-card': () => import('@heroicons/react/24/outline').then(m => ({ default: m.CreditCardIcon })),
  'globe-alt': () => import('@heroicons/react/24/outline').then(m => ({ default: m.GlobeAltIcon })),
  'plus': () => import('@heroicons/react/24/outline').then(m => ({ default: m.PlusIcon })),
  'magnifying-glass': () => import('@heroicons/react/24/outline').then(m => ({ default: m.MagnifyingGlassIcon })),
  'funnel': () => import('@heroicons/react/24/outline').then(m => ({ default: m.FunnelIcon })),
  'chevron-left': () => import('@heroicons/react/24/outline').then(m => ({ default: m.ChevronLeftIcon })),
  'chevron-right': () => import('@heroicons/react/24/outline').then(m => ({ default: m.ChevronRightIcon })),
  'building-office': () => import('@heroicons/react/24/outline').then(m => ({ default: m.BuildingOfficeIcon })),
  'shield-check': () => import('@heroicons/react/24/outline').then(m => ({ default: m.ShieldCheckIcon })),
  'chart-bar': () => import('@heroicons/react/24/outline').then(m => ({ default: m.ChartBarIcon })),
  'bell': () => import('@heroicons/react/24/outline').then(m => ({ default: m.BellIcon })),
  'ellipsis-vertical': () => import('@heroicons/react/24/outline').then(m => ({ default: m.EllipsisVerticalIcon })),
  'check-circle': () => import('@heroicons/react/24/outline').then(m => ({ default: m.CheckCircleIcon })),
  'exclamation-triangle': () => import('@heroicons/react/24/outline').then(m => ({ default: m.ExclamationTriangleIcon })),
  'x-circle': () => import('@heroicons/react/24/outline').then(m => ({ default: m.XCircleIcon })),
  'clock': () => import('@heroicons/react/24/outline').then(m => ({ default: m.ClockIcon })),
  'squares-2x2': () => import('@heroicons/react/24/outline').then(m => ({ default: m.Squares2X2Icon })),
  'list-bullet': () => import('@heroicons/react/24/outline').then(m => ({ default: m.ListBulletIcon })),
} as const;

type IconName = keyof typeof iconMap;

interface IconProps {
  name: IconName;
  className?: string;
  [key: string]: any;
}

// Icon component with fallback
export const Icon: React.FC<IconProps> = ({ name, className = "w-5 h-5", ...props }) => {
  const IconComponent = React.lazy(() => {
    const iconLoader = iconMap[name];
    return iconLoader();
  });

  return (
    <Suspense fallback={<div className={`animate-pulse bg-gray-200 rounded ${className}`} />}>
      <IconComponent className={className} {...props} />
    </Suspense>
  );
};

// Preload commonly used icons
export const preloadIcons = (iconNames: IconName[]) => {
  iconNames.forEach(name => {
    if (iconMap[name]) {
      iconMap[name]();
    }
  });
};
