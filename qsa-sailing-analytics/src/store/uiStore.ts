/**
 * UI Store
 * Manages application-wide UI state and preferences
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ViewType, MetricType, UIPreferences, PanelLayout } from '@/core/models';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timeout?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'destructive';
  }>;
}

interface Modal {
  id: string;
  type: 'file_picker' | 'settings' | 'export' | 'about' | 'error' | 'confirm';
  title: string;
  content?: React.ReactNode;
  data?: Record<string, any>;
  onClose?: () => void;
  onConfirm?: () => void;
}

interface UIState {
  // Current view
  currentView: ViewType;

  // Sidebar state
  sidebar: {
    visible: boolean;
    collapsed: boolean;
    activeTab: 'sessions' | 'analysis' | 'settings';
    width: number;
  };

  // Timeline state
  timeline: {
    visible: boolean;
    height: number;
  };

  // Panel layouts
  currentLayout: string;
  layouts: Record<string, PanelLayout>;

  // Selected metrics for charts
  selectedMetrics: MetricType[];
  chartConfigs: Record<string, any>;

  // Notifications
  notifications: Notification[];

  // Modals
  activeModal: Modal | null;
  modals: Modal[];

  // Loading states
  globalLoading: boolean;
  loadingTasks: Array<{
    id: string;
    message: string;
    progress?: number;
  }>;

  // User preferences
  preferences: UIPreferences;

  // Window state
  windowState: {
    width: number;
    height: number;
    isMaximized: boolean;
    isFullscreen: boolean;
  };

  // Actions
  setCurrentView: (view: ViewType) => void;

  // Sidebar
  setSidebarVisible: (visible: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarActiveTab: (tab: 'sessions' | 'analysis' | 'settings') => void;
  setSidebarWidth: (width: number) => void;

  // Timeline
  setTimelineVisible: (visible: boolean) => void;
  setTimelineHeight: (height: number) => void;

  // Panel layouts
  setCurrentLayout: (layoutId: string) => void;
  saveLayout: (layout: PanelLayout) => void;
  deleteLayout: (layoutId: string) => void;
  resetToDefaultLayout: () => void;

  // Metrics
  setSelectedMetrics: (metrics: MetricType[]) => void;
  addMetric: (metric: MetricType) => void;
  removeMetric: (metric: MetricType) => void;

  // Chart configs
  updateChartConfig: (chartId: string, config: any) => void;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Modals
  openModal: (modal: Omit<Modal, 'id'>) => void;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;

  // Loading
  setGlobalLoading: (loading: boolean) => void;
  addLoadingTask: (task: { id: string; message: string; progress?: number }) => void;
  updateLoadingTask: (id: string, updates: { message?: string; progress?: number }) => void;
  removeLoadingTask: (id: string) => void;

  // Preferences
  updatePreferences: (updates: Partial<UIPreferences>) => void;
  resetPreferences: () => void;

  // Window
  updateWindowState: (state: Partial<UIState['windowState']>) => void;

  // Utilities
  showError: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  confirmAction: (title: string, message: string, onConfirm: () => void) => void;
}

// Default preferences
const defaultPreferences: UIPreferences = {
  theme: 'dark',
  units: {
    speed: 'knots',
    distance: 'nm',
    temperature: 'celsius',
    angle: 'degrees',
  },
  numberFormat: {
    precision: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  defaultLayout: 'default',
  autoSave: true,
  confirmDestructive: true,
  animations: true,
  tooltips: true,
  keyboardShortcuts: true,
};

// Default panel layout
const defaultLayout: PanelLayout = {
  id: 'default',
  name: 'Default Layout',
  panels: [
    {
      id: 'map',
      type: 'map',
      position: { x: 0, y: 0, w: 8, h: 12 },
      config: {
        center: [11.516667, 48.1173] as [number, number],
        zoom: 12,
        bearing: 0,
        pitch: 0,
        followBoat: true,
        showTrack: true,
        trackColorScheme: 'speed' as const,
        showMarkers: true,
        showGrid: false,
        basemap: 'dark' as const,
      },
      visible: true,
    },
    {
      id: 'charts',
      type: 'chart',
      position: { x: 8, y: 0, w: 4, h: 6 },
      config: {
        id: 'default-chart',
        type: 'time_series' as const,
        title: 'Performance Data',
        metrics: ['bsp', 'tws', 'twa'] as any[],
        yAxes: [
          {
            id: 'speed',
            position: 'left' as const,
            label: 'Speed (knots)',
            unit: 'knots',
            metrics: ['bsp'] as any[],
          },
          {
            id: 'wind',
            position: 'right' as const,
            label: 'Wind',
            unit: 'knots/deg',
            metrics: ['tws', 'twa'] as any[],
          },
        ],
        height: 300,
        showCursor: true,
        showBrush: true,
        syncWithTimeline: true,
      },
      visible: true,
    },
    {
      id: 'polar',
      type: 'polar',
      position: { x: 8, y: 6, w: 4, h: 6 },
      config: {
        showTargets: true,
        showData: true,
        colorByWindSpeed: true,
        viewType: 'speed' as const,
        gridLines: true,
        angleLabels: true,
        speedRings: true,
      },
      visible: true,
    },
  ],
  isDefault: true,
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentView: 'dashboard',

        sidebar: {
          visible: true,
          collapsed: false,
          activeTab: 'sessions',
          width: 320,
        },

        timeline: {
          visible: true,
          height: 120,
        },

        currentLayout: 'default',
        layouts: { default: defaultLayout },

        selectedMetrics: ['bsp', 'tws', 'twa'],
        chartConfigs: {},

        notifications: [],
        activeModal: null,
        modals: [],

        globalLoading: false,
        loadingTasks: [],

        preferences: defaultPreferences,

        windowState: {
          width: 1400,
          height: 900,
          isMaximized: false,
          isFullscreen: false,
        },

        // Actions
        setCurrentView: (view: ViewType) => {
          set({ currentView: view });

          // Emit navigation event
          window.dispatchEvent(new CustomEvent('view-changed', {
            detail: { view }
          }));
        },

        // Sidebar actions
        setSidebarVisible: (visible: boolean) => {
          set(state => ({
            sidebar: { ...state.sidebar, visible }
          }));
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set(state => ({
            sidebar: { ...state.sidebar, collapsed }
          }));
        },

        setSidebarActiveTab: (tab: 'sessions' | 'analysis' | 'settings') => {
          set(state => ({
            sidebar: { ...state.sidebar, activeTab: tab }
          }));
        },

        setSidebarWidth: (width: number) => {
          set(state => ({
            sidebar: { ...state.sidebar, width: Math.max(200, Math.min(600, width)) }
          }));
        },

        // Timeline actions
        setTimelineVisible: (visible: boolean) => {
          set(state => ({
            timeline: { ...state.timeline, visible }
          }));
        },

        setTimelineHeight: (height: number) => {
          set(state => ({
            timeline: { ...state.timeline, height: Math.max(60, Math.min(300, height)) }
          }));
        },

        // Layout actions
        setCurrentLayout: (layoutId: string) => {
          const state = get();
          if (state.layouts[layoutId]) {
            set({ currentLayout: layoutId });
          }
        },

        saveLayout: (layout: PanelLayout) => {
          set(state => ({
            layouts: { ...state.layouts, [layout.id]: layout }
          }));
        },

        deleteLayout: (layoutId: string) => {
          const state = get();
          if (layoutId === 'default') return; // Can't delete default layout

          const newLayouts = { ...state.layouts };
          delete newLayouts[layoutId];

          set({
            layouts: newLayouts,
            currentLayout: state.currentLayout === layoutId ? 'default' : state.currentLayout,
          });
        },

        resetToDefaultLayout: () => {
          set({
            currentLayout: 'default',
            layouts: { default: defaultLayout },
          });
        },

        // Metrics actions
        setSelectedMetrics: (metrics: MetricType[]) => {
          set({ selectedMetrics: metrics });
        },

        addMetric: (metric: MetricType) => {
          const state = get();
          if (!state.selectedMetrics.includes(metric)) {
            set({ selectedMetrics: [...state.selectedMetrics, metric] });
          }
        },

        removeMetric: (metric: MetricType) => {
          const state = get();
          set({
            selectedMetrics: state.selectedMetrics.filter(m => m !== metric)
          });
        },

        // Chart config
        updateChartConfig: (chartId: string, config: any) => {
          set(state => ({
            chartConfigs: { ...state.chartConfigs, [chartId]: config }
          }));
        },

        // Notification actions
        addNotification: (notification: Omit<Notification, 'id'>) => {
          const id = Date.now().toString();
          const fullNotification = { ...notification, id };

          set(state => ({
            notifications: [...state.notifications, fullNotification]
          }));

          // Auto-remove after timeout
          if (notification.timeout !== undefined) {
            setTimeout(() => {
              get().removeNotification(id);
            }, notification.timeout);
          } else if (notification.type !== 'error') {
            // Default timeout for non-error notifications
            setTimeout(() => {
              get().removeNotification(id);
            }, 5000);
          }
        },

        removeNotification: (id: string) => {
          set(state => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }));
        },

        clearNotifications: () => {
          set({ notifications: [] });
        },

        // Modal actions
        openModal: (modal: Omit<Modal, 'id'>) => {
          const id = Date.now().toString();
          const fullModal = { ...modal, id };

          set(state => ({
            activeModal: fullModal,
            modals: [...state.modals, fullModal]
          }));
        },

        closeModal: (id?: string) => {
          const state = get();

          if (id) {
            const newModals = state.modals.filter(m => m.id !== id);
            set({
              modals: newModals,
              activeModal: newModals[newModals.length - 1] || null,
            });
          } else {
            // Close active modal
            if (state.activeModal) {
              const newModals = state.modals.filter(m => m.id !== state.activeModal!.id);
              set({
                modals: newModals,
                activeModal: newModals[newModals.length - 1] || null,
              });
            }
          }
        },

        closeAllModals: () => {
          set({ modals: [], activeModal: null });
        },

        // Loading actions
        setGlobalLoading: (loading: boolean) => {
          set({ globalLoading: loading });
        },

        addLoadingTask: (task) => {
          set(state => ({
            loadingTasks: [...state.loadingTasks, task]
          }));
        },

        updateLoadingTask: (id: string, updates) => {
          set(state => ({
            loadingTasks: state.loadingTasks.map(task =>
              task.id === id ? { ...task, ...updates } : task
            )
          }));
        },

        removeLoadingTask: (id: string) => {
          set(state => ({
            loadingTasks: state.loadingTasks.filter(task => task.id !== id)
          }));
        },

        // Preferences actions
        updatePreferences: (updates: Partial<UIPreferences>) => {
          set(state => ({
            preferences: { ...state.preferences, ...updates }
          }));
        },

        resetPreferences: () => {
          set({ preferences: defaultPreferences });
        },

        // Window actions
        updateWindowState: (state: Partial<UIState['windowState']>) => {
          set(prevState => ({
            windowState: { ...prevState.windowState, ...state }
          }));
        },

        // Utility actions
        showError: (title: string, message: string) => {
          get().addNotification({
            type: 'error',
            title,
            message,
          });
        },

        showSuccess: (title: string, message: string) => {
          get().addNotification({
            type: 'success',
            title,
            message,
            timeout: 3000,
          });
        },

        showWarning: (title: string, message: string) => {
          get().addNotification({
            type: 'warning',
            title,
            message,
            timeout: 5000,
          });
        },

        showInfo: (title: string, message: string) => {
          get().addNotification({
            type: 'info',
            title,
            message,
            timeout: 4000,
          });
        },

        confirmAction: (title: string, message: string, onConfirm: () => void) => {
          get().openModal({
            type: 'confirm',
            title,
            data: { message },
            onConfirm,
          });
        },
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          // Only persist certain UI state
          sidebar: state.sidebar,
          timeline: state.timeline,
          currentLayout: state.currentLayout,
          layouts: state.layouts,
          selectedMetrics: state.selectedMetrics,
          preferences: state.preferences,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
);

// Selectors for easy access
export const useCurrentView = () => useUIStore(state => state.currentView);
export const useSidebar = () => useUIStore(state => state.sidebar);
export const useTimeline = () => useUIStore(state => state.timeline);
export const useNotifications = () => useUIStore(state => state.notifications);
export const useActiveModal = () => useUIStore(state => state.activeModal);
export const usePreferences = () => useUIStore(state => state.preferences);
export const useSelectedMetrics = () => useUIStore(state => state.selectedMetrics);

// Theme detection and application
if (typeof window !== 'undefined') {
  const applyTheme = (theme: 'dark' | 'light') => {
    document.documentElement.className = theme;
  };

  // Apply initial theme
  const initialTheme = useUIStore.getState().preferences.theme;
  applyTheme(initialTheme);

  // Listen for theme changes
  useUIStore.subscribe(
    (state) => {
      applyTheme(state.preferences.theme);
    }
  );
}