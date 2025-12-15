# Deals247 Mobile App

A React Native mobile application for browsing and discovering deals, built with Expo.

## Features

- 🔐 User Authentication (Firebase)
- 🏷️ Browse Hot Deals by Category
- 📱 Deal Details with Store Information
- 👤 User Profile Management
- 🔄 Pull-to-Refresh Functionality
- 📱 Cross-platform (iOS & Android)

## Tech Stack

- **React Native** - Mobile framework
- **Expo** - Development platform
- **Firebase** - Authentication & Backend
- **React Navigation** - Navigation library
- **Axios** - HTTP client
- **AsyncStorage** - Local storage

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project

### Installation

1. **Clone the repository and navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication with Email/Password
   - Copy your Firebase config to `config/firebase.js`

4. **Update API Configuration:**
   - Update `API_BASE_URL` in `screens/DealsScreen.js` to point to your Deals247 API

### Running the App

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Run on device/emulator:**
   - **iOS:** `npm run ios` (requires macOS)
   - **Android:** `npm run android`
   - **Web:** `npm run web`

3. **Using Expo Go app:**
   - Install Expo Go on your device
   - Scan the QR code shown in terminal

## Project Structure

```
mobile/
├── assets/              # Static assets
├── config/              # Configuration files
│   └── firebase.js      # Firebase configuration
├── navigation/          # Navigation setup
│   └── AppNavigator.js  # Main navigation component
├── screens/             # Screen components
│   ├── LoginScreen.js   # Authentication screen
│   ├── DealsScreen.js   # Main deals browsing
│   ├── DealDetailScreen.js # Individual deal details
│   └── ProfileScreen.js # User profile
├── App.js               # Main app component
├── app.json             # Expo configuration
└── package.json         # Dependencies
```

## API Integration

The app integrates with the Deals247 API endpoints:

- `GET /api/deals` - Fetch all deals
- `GET /api/deals?category={category}` - Fetch deals by category
- `GET /api/categories` - Fetch available categories

## Authentication Flow

1. User opens app → Login/Register screen
2. Firebase authentication on login/register
3. User token stored in AsyncStorage
4. Authenticated users access main app with bottom tabs

## Navigation Structure

```
Stack Navigator
├── Login/Register Screen
├── Main Tab Navigator
│   ├── Deals Tab
│   │   └── Deal Detail Screen (modal)
│   └── Profile Tab
```

## Development Notes

- **Hot Reload:** Changes are automatically reflected in the app
- **Debugging:** Use `console.log()` or Expo DevTools
- **Testing:** Test on both iOS and Android devices
- **Performance:** Implement pagination for large deal lists

## Deployment

1. **Build for production:**
   ```bash
   expo build:android
   expo build:ios
   ```

2. **Submit to app stores:**
   - Google Play Store
   - Apple App Store

## Contributing

1. Follow React Native and Expo best practices
2. Test on multiple devices/screen sizes
3. Update documentation for new features
4. Ensure Firebase security rules are properly configured

## Troubleshooting

- **Metro bundler issues:** Clear cache with `expo r -c`
- **Firebase errors:** Check Firebase configuration and internet connection
- **Navigation issues:** Verify navigation structure and screen names
- **API errors:** Check API_BASE_URL and network connectivity

## License

This project is part of the Deals247 platform.