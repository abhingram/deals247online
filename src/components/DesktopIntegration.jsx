import React, { useEffect, useState } from 'react';
import { Bell, Minimize2, X, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

// Desktop integration hook
export const useDesktopIntegration = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [appInfo, setAppInfo] = useState(null);

  useEffect(() => {
    // Check if running in Electron
    if (window.electronAPI) {
      setIsDesktop(true);

      // Get app information
      window.electronAPI.getAppInfo().then(setAppInfo);

      // Listen for navigation events from main process
      const handleNavigateToDeal = (event, dealId) => {
        // Navigate to specific deal
        window.location.hash = `#/deal/${dealId}`;
      };

      const handleNavigateToSection = (event, section) => {
        // Navigate to section
        window.location.hash = `#/${section}`;
      };

      const handleFocusSearch = () => {
        // Focus search input
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]');
        if (searchInput) {
          searchInput.focus();
        }
      };

      window.electronAPI.onNavigateToDeal(handleNavigateToDeal);
      window.electronAPI.onNavigateToSection(handleNavigateToSection);
      window.electronAPI.onFocusSearch(handleFocusSearch);

      return () => {
        window.electronAPI.removeAllListeners('navigate-to-deal');
        window.electronAPI.removeAllListeners('navigate-to-section');
        window.electronAPI.removeAllListeners('focus-search');
      };
    }
  }, []);

  const showDealNotification = (dealData) => {
    if (window.electronAPI) {
      window.electronAPI.showDealNotification(dealData);
    }
  };

  const showPriceDropNotification = (dealData) => {
    if (window.electronAPI) {
      window.electronAPI.showPriceDropNotification(dealData);
    }
  };

  const minimizeToTray = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeToTray();
    }
  };

  const quitApp = () => {
    if (window.electronAPI) {
      window.electronAPI.quitApp();
    }
  };

  const openExternal = (url) => {
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return {
    isDesktop,
    appInfo,
    showDealNotification,
    showPriceDropNotification,
    minimizeToTray,
    quitApp,
    openExternal
  };
};

// Desktop title bar component
export const DesktopTitleBar = () => {
  const { isDesktop, minimizeToTray, quitApp } = useDesktopIntegration();
  const { toast } = useToast();

  if (!isDesktop) return null;

  const handleMinimize = () => {
    minimizeToTray();
    toast({
      title: "Minimized to tray",
      description: "Deals247 is running in the background. Click the tray icon to restore.",
    });
  };

  const handleClose = () => {
    quitApp();
  };

  return (
    <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2 select-none drag">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-xs">D</span>
        </div>
        <span className="font-semibold text-gray-900">Deals247</span>
      </div>

      <div className="flex items-center space-x-1 no-drag">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMinimize}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Desktop notification manager
export const DesktopNotificationManager = ({ deals }) => {
  const { isDesktop, showDealNotification, showPriceDropNotification } = useDesktopIntegration();

  useEffect(() => {
    if (!isDesktop || !deals?.length) return;

    // Check for new deals and show notifications
    const checkForNotifications = () => {
      deals.forEach(deal => {
        // Show notification for high-value deals
        if (deal.discount >= 50) {
          showDealNotification({
            id: deal.id,
            title: deal.title,
            discount: `${deal.discount}%`,
            store: deal.store
          });
        }

        // Show price drop notifications (simplified logic)
        if (deal.priceDrop) {
          showPriceDropNotification({
            id: deal.id,
            title: deal.title,
            discount: `$${deal.priceDrop}`
          });
        }
      });
    };

    // Check immediately and then periodically
    checkForNotifications();
    const interval = setInterval(checkForNotifications, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [deals, isDesktop, showDealNotification, showPriceDropNotification]);

  return null; // This component doesn't render anything
};

// Desktop keyboard shortcuts
export const useDesktopKeyboardShortcuts = () => {
  const { isDesktop } = useDesktopIntegration();

  useEffect(() => {
    if (!isDesktop) return;

    const handleKeyDown = (event) => {
      // Cmd/Ctrl + K: Focus search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Cmd/Ctrl + T: Today's deals
      if ((event.metaKey || event.ctrlKey) && event.key === 't') {
        event.preventDefault();
        window.location.hash = '#/today';
      }

      // Cmd/Ctrl + F: Favorites
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        window.location.hash = '#/favorites';
      }

      // Cmd/Ctrl + N: New window (handled by main process)
      // Cmd/Ctrl + Q: Quit (handled by main process)
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop]);
};

// External link handler for desktop
export const DesktopExternalLink = ({ href, children, ...props }) => {
  const { openExternal } = useDesktopIntegration();

  const handleClick = (e) => {
    e.preventDefault();
    openExternal(href);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
      <ExternalLink className="inline-block w-3 h-3 ml-1" />
    </a>
  );
};

// Desktop app indicator
export const DesktopAppIndicator = () => {
  const { isDesktop, appInfo } = useDesktopIntegration();

  if (!isDesktop) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
      <div className="flex items-center space-x-2">
        <Bell className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">Desktop App</span>
        {appInfo && (
          <span className="text-xs text-gray-500">v{appInfo.version}</span>
        )}
      </div>
    </div>
  );
};

export default {
  useDesktopIntegration,
  DesktopTitleBar,
  DesktopNotificationManager,
  useDesktopKeyboardShortcuts,
  DesktopExternalLink,
  DesktopAppIndicator
};