import { PanGestureHandler, PinchGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

class AdvancedGesturesService {
  constructor() {
    this.gestureSettings = {
      swipeThreshold: 50,
      pinchEnabled: true,
      doubleTapEnabled: true,
      longPressEnabled: true,
      hapticFeedback: true,
    };
    this.loadGestureSettings();
  }

  // Load user gesture preferences
  async loadGestureSettings() {
    try {
      const settings = await AsyncStorage.getItem('gestureSettings');
      if (settings) {
        this.gestureSettings = { ...this.gestureSettings, ...JSON.parse(settings) };
      }
    } catch (error) {
      console.error('Error loading gesture settings:', error);
    }
  }

  // Save gesture preferences
  async saveGestureSettings(settings) {
    try {
      this.gestureSettings = { ...this.gestureSettings, ...settings };
      await AsyncStorage.setItem('gestureSettings', JSON.stringify(this.gestureSettings));
    } catch (error) {
      console.error('Error saving gesture settings:', error);
    }
  }

  // Get current gesture settings
  getGestureSettings() {
    return this.gestureSettings;
  }

  // Swipe gesture handler for deal cards
  createSwipeGestureHandler(onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown) {
    return useAnimatedGestureHandler({
      onStart: (_, context) => {
        context.startX = _.x;
        context.startY = _.y;
      },
      onActive: (event, context) => {
        const deltaX = event.x - context.startX;
        const deltaY = event.y - context.startY;

        // Determine swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (Math.abs(deltaX) > this.gestureSettings.swipeThreshold) {
            if (deltaX > 0 && onSwipeRight) {
              runOnJS(onSwipeRight)();
            } else if (deltaX < 0 && onSwipeLeft) {
              runOnJS(onSwipeLeft)();
            }
          }
        } else {
          // Vertical swipe
          if (Math.abs(deltaY) > this.gestureSettings.swipeThreshold) {
            if (deltaY > 0 && onSwipeDown) {
              runOnJS(onSwipeDown)();
            } else if (deltaY < 0 && onSwipeUp) {
              runOnJS(onSwipeUp)();
            }
          }
        }
      },
    });
  }

  // Pinch-to-zoom gesture handler
  createPinchGestureHandler(onZoom, onZoomEnd) {
    const scale = useSharedValue(1);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);

    const pinchHandler = useAnimatedGestureHandler({
      onStart: (event) => {
        focalX.value = event.focalX;
        focalY.value = event.focalY;
      },
      onActive: (event) => {
        scale.value = event.scale;
        if (onZoom) {
          runOnJS(onZoom)(event.scale);
        }
      },
      onEnd: () => {
        scale.value = withSpring(1);
        if (onZoomEnd) {
          runOnJS(onZoomEnd)();
        }
      },
    });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: scale.value },
        { translateX: focalX.value - SCREEN_WIDTH / 2 },
        { translateY: focalY.value - SCREEN_HEIGHT / 2 },
      ],
    }));

    return { pinchHandler, animatedStyle, scale };
  }

  // Double tap gesture handler
  createDoubleTapGestureHandler(onDoubleTap) {
    const doubleTapHandler = useAnimatedGestureHandler({
      onActive: () => {
        if (onDoubleTap) {
          runOnJS(onDoubleTap)();
        }
      },
    });

    return doubleTapHandler;
  }

  // Long press gesture handler
  createLongPressGestureHandler(onLongPress) {
    const longPressHandler = useAnimatedGestureHandler({
      onStart: () => {
        // Could add visual feedback here
      },
      onActive: () => {
        if (onLongPress) {
          runOnJS(onLongPress)();
        }
      },
      onEnd: () => {
        // Reset visual feedback
      },
    });

    return longPressHandler;
  }

  // Deal card interaction gestures
  createDealCardGestures(onFavorite, onShare, onCompare, onViewDetails) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const panHandler = useAnimatedGestureHandler({
      onStart: (_, context) => {
        context.startX = _.x;
        context.startY = _.y;
      },
      onActive: (event, context) => {
        const deltaX = event.x - context.startX;
        const deltaY = event.y - context.startY;

        // Horizontal pan for actions
        if (Math.abs(deltaX) > 30 && Math.abs(deltaY) < 20) {
          translateX.value = deltaX;
        }

        // Vertical pan for scrolling (handled by parent)
      },
      onEnd: (event) => {
        const velocity = event.velocityX;

        // Swipe right - Favorite
        if (translateX.value > 100 || (translateX.value > 50 && velocity > 500)) {
          if (onFavorite) {
            runOnJS(onFavorite)();
          }
        }
        // Swipe left - Share/Compare
        else if (translateX.value < -100 || (translateX.value < -50 && velocity < -500)) {
          if (onShare) {
            runOnJS(onShare)();
          }
        }

        // Reset position
        translateX.value = withSpring(0);
      },
    });

    const tapHandler = useAnimatedGestureHandler({
      onActive: () => {
        if (onViewDetails) {
          runOnJS(onViewDetails)();
        }
      },
    });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
      ],
    }));

    return { panHandler, tapHandler, animatedStyle };
  }

  // Pull-to-refresh gesture
  createPullToRefreshGesture(onRefresh) {
    const translateY = useSharedValue(0);
    const isRefreshing = useSharedValue(false);

    const pullHandler = useAnimatedGestureHandler({
      onStart: (_, context) => {
        context.startY = _.y;
      },
      onActive: (event, context) => {
        const deltaY = event.y - context.startY;

        if (deltaY > 0 && !isRefreshing.value) {
          translateY.value = deltaY * 0.5; // Dampen the pull
        }
      },
      onEnd: (event) => {
        const velocity = event.velocityY;

        // Trigger refresh if pulled far enough
        if (translateY.value > 100 || velocity > 1000) {
          isRefreshing.value = true;
          if (onRefresh) {
            runOnJS(onRefresh)();
          }
          // Keep pulled down during refresh
          translateY.value = withSpring(60);
        } else {
          // Reset position
          translateY.value = withSpring(0);
        }
      },
    });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const resetRefresh = () => {
      isRefreshing.value = false;
      translateY.value = withSpring(0);
    };

    return { pullHandler, animatedStyle, resetRefresh, isRefreshing };
  }

  // Gesture for deal comparison (multi-select)
  createMultiSelectGesture(selectedItems, onSelectionChange) {
    const longPressHandler = useAnimatedGestureHandler({
      onActive: () => {
        // Enter multi-select mode
        if (onSelectionChange) {
          runOnJS(onSelectionChange)({ mode: 'multi-select' });
        }
      },
    });

    const tapHandler = useAnimatedGestureHandler({
      onActive: () => {
        // Toggle selection in multi-select mode
        if (onSelectionChange) {
          runOnJS(onSelectionChange)({ action: 'toggle' });
        }
      },
    });

    return { longPressHandler, tapHandler };
  }

  // Haptic feedback helper
  triggerHapticFeedback(type = 'light') {
    if (this.gestureSettings.hapticFeedback) {
      // This would integrate with react-native-haptic-feedback
      // HapticFeedback.trigger(type);
    }
  }

  // Gesture analytics (optional)
  trackGesture(gestureType, data) {
    // Could send analytics data
    console.log(`Gesture tracked: ${gestureType}`, data);
  }
}

// Create singleton instance
const advancedGesturesService = new AdvancedGesturesService();

export default advancedGesturesService;