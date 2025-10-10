# Unified Dashboard Header Component

## Overview

The `DashboardHeader` component provides a unified, configurable header for all dashboard types in the application. It replaces the previously duplicated header implementations across Super Admin, Tenant Admin, and User dashboards.

## Features

- **Role-based customization**: Different configurations for different user roles
- **Multiple variants**: Default, compact, and minimal layouts
- **Flexible actions**: Configurable buttons for refresh, logout, profile, notifications, and settings
- **Consistent styling**: Unified design language across all dashboards
- **Animation support**: Smooth transitions and hover effects
- **Responsive design**: Works on all screen sizes

## Usage

### Basic Usage

```tsx
import { DashboardHeader } from '@/components/common';

<DashboardHeader
  title="Dashboard Title"
  subtitle="Dashboard subtitle"
  showRefresh={true}
  showLogout={true}
  showProfile={true}
  onRefresh={handleRefresh}
  onLogout={handleLogout}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Main header title |
| `subtitle` | `string` | - | Optional subtitle |
| `showRefresh` | `boolean` | `true` | Show refresh button |
| `showLogout` | `boolean` | `true` | Show logout button |
| `showProfile` | `boolean` | `true` | Show profile section |
| `showNotifications` | `boolean` | `false` | Show notifications button |
| `showSettings` | `boolean` | `false` | Show settings button |
| `onRefresh` | `function` | - | Refresh button handler |
| `onLogout` | `function` | - | Logout button handler |
| `onProfileClick` | `function` | - | Profile click handler |
| `onNotificationClick` | `function` | - | Notifications click handler |
| `onSettingsClick` | `function` | - | Settings click handler |
| `isLoading` | `boolean` | `false` | Loading state for refresh button |
| `customActions` | `ReactNode` | - | Custom action elements |
| `variant` | `'default' \| 'compact' \| 'minimal'` | `'default'` | Header variant |
| `className` | `string` | `''` | Additional CSS classes |

### Variants

#### Default Variant
Full-featured header with title, subtitle, action buttons, and user profile section.

```tsx
<DashboardHeader
  title="Super Admin Dashboard"
  subtitle="System overview and management"
  showRefresh={true}
  showLogout={true}
  showProfile={true}
  variant="default"
/>
```

#### Compact Variant
Simplified header with essential elements only.

```tsx
<DashboardHeader
  title="User Dashboard"
  subtitle="Welcome back, John!"
  variant="compact"
  customActions={<Button>Custom Action</Button>}
/>
```

#### Minimal Variant
Minimal header with just title and custom actions.

```tsx
<DashboardHeader
  title="Simple Page"
  variant="minimal"
  customActions={<Button>Action</Button>}
/>
```

## Role-Specific Examples

### Super Admin Dashboard

```tsx
<DashboardHeader
  title="Super Admin Dashboard"
  subtitle={`Welcome back, ${user?.firstName} ${user?.lastName}`}
  showRefresh={true}
  showLogout={true}
  showProfile={true}
  showNotifications={false}
  showSettings={false}
  onRefresh={loadDashboardData}
  onLogout={logout}
  isLoading={isLoading}
/>
```

### Tenant Admin Dashboard

```tsx
<DashboardHeader
  title="Tenant Dashboard"
  subtitle={`Welcome back, ${user?.firstName} ${user?.lastName}`}
  showRefresh={true}
  showLogout={false}
  showProfile={true}
  showNotifications={false}
  showSettings={true}
  onRefresh={loadDashboardData}
  onSettingsClick={() => navigate('/settings')}
  isLoading={isLoading}
  customActions={
    <div className="text-sm text-gray-500">
      Managing: {tenant?.name}
    </div>
  }
/>
```

### User Dashboard

```tsx
<DashboardHeader
  title={`Welcome back, ${user?.firstName}! 👋`}
  subtitle="Your immigration journey continues here"
  showRefresh={false}
  showLogout={false}
  showProfile={true}
  showNotifications={false}
  showSettings={false}
  variant="compact"
  customActions={<TenantContextIndicator />}
/>
```

## Migration Guide

### Before (Duplicated Headers)

Each dashboard had its own header implementation:

```tsx
// SuperAdminDashboard.tsx
<div className="bg-white shadow-sm border-b border-gray-200">
  <div className="max-w-7xl mx-auto py-6 px-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Super Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {user?.firstName}
        </p>
      </div>
      <div className="flex items-center space-x-3">
        <button onClick={loadDashboardData}>Refresh</button>
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  </div>
</div>
```

### After (Unified Header)

Replace with the unified component:

```tsx
// Any dashboard
<DashboardHeader
  title="Super Admin Dashboard"
  subtitle={`Welcome back, ${user?.firstName}`}
  showRefresh={true}
  showLogout={true}
  onRefresh={loadDashboardData}
  onLogout={logout}
/>
```

## Benefits

1. **Consistency**: All dashboards now have a consistent look and feel
2. **Maintainability**: Single component to maintain instead of multiple implementations
3. **Flexibility**: Easy to customize for different roles and use cases
4. **Reusability**: Can be used across any dashboard or page
5. **Performance**: Optimized animations and rendering
6. **Accessibility**: Built-in accessibility features

## Customization

### Custom Actions

Add custom buttons or elements to the header:

```tsx
<DashboardHeader
  title="Custom Dashboard"
  customActions={
    <div className="flex gap-2">
      <Button variant="outline" size="sm">
        Export
      </Button>
      <Button variant="outline" size="sm">
        Import
      </Button>
    </div>
  }
/>
```

### Custom Styling

Add custom CSS classes:

```tsx
<DashboardHeader
  title="Styled Dashboard"
  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
/>
```

## Best Practices

1. **Use appropriate variants**: Choose the right variant for your use case
2. **Provide meaningful titles**: Use descriptive titles and subtitles
3. **Handle loading states**: Always provide `isLoading` prop for better UX
4. **Custom actions sparingly**: Use custom actions only when necessary
5. **Consistent button placement**: Follow the established button order
6. **Accessibility**: Ensure all interactive elements are accessible

## Future Enhancements

- [ ] Dark mode support
- [ ] Breadcrumb navigation
- [ ] Search functionality
- [ ] Quick actions menu
- [ ] User preferences integration
- [ ] Theme customization
