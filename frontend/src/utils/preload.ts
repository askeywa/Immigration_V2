// Lightweight helpers to preload route modules or resources

export function preloadRoute(loader: () => Promise<unknown>): void {
  try {
    loader();
  } catch {
    // ignore
  }
}

export function prefetchUrl(url: string): void {
  try {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  } catch {
    // ignore
  }
}


