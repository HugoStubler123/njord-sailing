/**
 * Settings Panel Component
 * Application settings and preferences
 */

import React from 'react';
import { usePreferences, useUIStore } from '@/store/uiStore';

/**
 * SettingsPanel Component
 * - Theme selection
 * - Unit preferences
 * - Application settings
 */
export function SettingsPanel(): React.ReactElement {
  const preferences = usePreferences();
  const { updatePreferences } = useUIStore();

  const handleThemeChange = (theme: 'light' | 'dark') => {
    updatePreferences({ theme });
  };

  const handleUnitChange = (unitType: string, unit: string) => {
    updatePreferences({
      units: {
        ...preferences.units,
        [unitType]: unit
      }
    });
  };

  return (
    <div className="flex flex-col h-full p-3 space-y-4">
      {/* Header */}
      <h3 className="text-sm font-medium text-gray-200">Settings</h3>

      {/* Theme */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wide">
          Theme
        </h4>
        <div className="space-y-1">
          <label className="flex items-center">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={preferences.theme === 'dark'}
              onChange={() => handleThemeChange('dark')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-300">Dark</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={preferences.theme === 'light'}
              onChange={() => handleThemeChange('light')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-300">Light</span>
          </label>
        </div>
      </div>

      {/* Units */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wide">
          Units
        </h4>

        {/* Speed */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Speed</label>
          <select
            value={preferences.units.speed}
            onChange={(e) => handleUnitChange('speed', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="knots">Knots</option>
            <option value="mph">MPH</option>
            <option value="kph">KPH</option>
          </select>
        </div>

        {/* Distance */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Distance</label>
          <select
            value={preferences.units.distance}
            onChange={(e) => handleUnitChange('distance', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="nm">Nautical Miles</option>
            <option value="km">Kilometers</option>
            <option value="mi">Miles</option>
          </select>
        </div>

        {/* Temperature */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Temperature</label>
          <select
            value={preferences.units.temperature}
            onChange={(e) => handleUnitChange('temperature', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="celsius">Celsius</option>
            <option value="fahrenheit">Fahrenheit</option>
          </select>
        </div>
      </div>

      {/* Other Settings */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wide">
          Preferences
        </h4>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={preferences.autoSave}
            onChange={(e) => updatePreferences({ autoSave: e.target.checked })}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-300">Auto-save sessions</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={preferences.animations}
            onChange={(e) => updatePreferences({ animations: e.target.checked })}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-300">Animations</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={preferences.keyboardShortcuts}
            onChange={(e) => updatePreferences({ keyboardShortcuts: e.target.checked })}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-300">Keyboard shortcuts</span>
        </label>
      </div>

      {/* Reset Button */}
      <div className="pt-3 border-t border-gray-700">
        <button
          onClick={() => {
            if (confirm('Reset all settings to defaults?')) {
              // Reset would be implemented here
              console.log('Reset settings');
            }
          }}
          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}