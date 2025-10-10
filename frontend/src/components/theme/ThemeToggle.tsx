// frontend/src/components/theme/ThemeToggle.tsx

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Sun, 
  Moon, 
  Palette, 
  Settings, 
  Download, 
  Upload,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';

interface ThemeToggleProps {
  showAdvanced?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  showAdvanced = false, 
  className = '' 
}) => {
  const { 
    isDarkMode, 
    toggleDarkMode, 
    resetToDefault, 
    exportTheme, 
    importTheme,
    isLoading 
  } = useTheme();

  const [showMenu, setShowMenu] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleExportTheme = () => {
    const themeData = exportTheme();
    const blob = new Blob([themeData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await importTheme(content);
        setShowImportDialog(false);
        setShowMenu(false);
      } catch (error) {
        console.error('Failed to import theme:', error);
        alert('Failed to import theme. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetTheme = async () => {
    if (window.confirm('Are you sure you want to reset the theme to default? This action cannot be undone.')) {
      try {
        await resetToDefault();
        setShowMenu(false);
      } catch (error) {
        console.error('Failed to reset theme:', error);
        alert('Failed to reset theme. Please try again.');
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Toggle Button */}
      <button
        onClick={toggleDarkMode}
        disabled={isLoading}
        className={`
          flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
          ${isDarkMode 
            ? 'bg-gray-800 text-white hover:bg-gray-700' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isDarkMode ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>

      {/* Advanced Menu */}
      {showAdvanced && (
        <>
          {/* Menu Toggle */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`
              ml-2 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
              ${isDarkMode 
                ? 'bg-gray-800 text-white hover:bg-gray-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            title="Theme options"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                <button
                  onClick={handleExportTheme}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-4 h-4 mr-3" />
                  Export Theme
                </button>
                
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-3" />
                  Import Theme
                </button>
                
                <div className="border-t border-gray-200 my-1" />
                
                <button
                  onClick={handleResetTheme}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-3" />
                  Reset to Default
                </button>
              </div>
            </div>
          )}

          {/* Import Dialog */}
          {showImportDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Import Theme
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select a theme file to import. The file should be a JSON file exported from the theme customizer.
                </p>
                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportTheme}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setShowImportDialog(false)}
                      className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Click Outside Handler */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

// Compact version for headers/navbars
export const CompactThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode, isLoading } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      disabled={isLoading}
      className={`
        flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${isDarkMode 
          ? 'bg-gray-800 text-white hover:bg-gray-700' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isDarkMode ? (
        <>
          <Sun className="w-4 h-4" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
};

// Theme indicator for showing current theme status
export const ThemeIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, isDarkMode } = useTheme();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: theme.primary.main }}
        />
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: theme.secondary.main }}
        />
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: theme.accent.main }}
        />
      </div>
      <span className="text-xs text-gray-500">
        {theme.metadata.name} {isDarkMode ? '(Dark)' : '(Light)'}
      </span>
    </div>
  );
};

export default ThemeToggle;
