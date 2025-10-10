// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { TenantProvider } from './contexts/TenantContext'

// Create React Query client with enhanced caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Render app immediately
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <App />
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>,
);

// Initialize Sentry AFTER render (non-blocking)
// This runs after the user sees content
if (import.meta.env.VITE_SENTRY_DSN) {
  setTimeout(async () => {
    try {
      const SentryService = (await import('./config/sentry')).default;
      const sentryService = SentryService.getInstance();
      await sentryService.initialize();
      console.log('✅ Sentry initialized (deferred)');
    } catch (error) {
      console.warn('⚠️ Sentry initialization failed:', error);
    }
  }, 2000); // Initialize after 2 seconds
}

// Service Worker registration (optional - for PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silently fail if service worker not available
    });
  });
}