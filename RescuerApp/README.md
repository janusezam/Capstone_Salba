# SALBA Rescuer App

Emergency Reporting & Rescue Coordination App for Malaybalay City - **Rescuer Mobile App**

## Features

- **Login/Register**: Secure authentication for rescuers
- **Dashboard**: Overview of team status, current mission, and quick actions
- **Mission Map**: Real-time map showing assigned emergency locations
- **Notifications**: Receive dispatch alerts and mission updates
- **Profile Management**: Update personal information and settings

## Tech Stack

- React Native with Expo
- React Navigation for routing
- React Native Maps for map display
- Socket.io for real-time communication
- Expo Notifications for push notifications
- Expo Location for GPS tracking

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android emulator) or Xcode (for iOS simulator)
- Expo Go app on your physical device (optional)

### Installation

1. Navigate to the RescuerApp directory:
   ```bash
   cd RescuerApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. **Important**: Update the API configuration in `src/config/api.js`:
   
   - For **emulator testing**: Use `http://10.0.2.2:5000` (Android) or `http://localhost:5000` (iOS)
   - For **physical device testing**: Use your computer's local IP address (e.g., `http://192.168.1.100:5000`)
   
   Find your IP address:
   - Windows: `ipconfig` in Command Prompt
   - Mac/Linux: `ifconfig` in Terminal

4. Start the development server:
   ```bash
   npm start
   # or
   expo start
   ```

5. Run on device/emulator:
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go app for physical device

### Backend Connection

Make sure the backend server is running:

```bash
cd ../EmergencyApp/reliefgoods/backend
npm start
```

The backend should be running on port 5000.

## Project Structure

```
RescuerApp/
├── App.js                 # Main app entry with navigation
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── src/
│   ├── config/
│   │   └── api.js         # API configuration
│   ├── context/
│   │   ├── AuthContext.js      # Authentication state management
│   │   ├── SocketContext.js    # Socket.io connection management
│   │   └── NotificationContext.js  # Push notifications
│   └── screens/
│       ├── LoginScreen.js      # Login page
│       ├── RegisterScreen.js   # Registration page
│       ├── DashboardScreen.js  # Main dashboard
│       ├── MapScreen.js        # Mission map
│       ├── NotificationsScreen.js  # Alerts list
│       └── ProfileScreen.js    # User profile
└── assets/                # App icons and images
```

## Team Structure

Rescuers are organized into 4 teams:
- **Team Alpha** (Red)
- **Team Bravo** (Orange/Yellow)
- **Team Charlie** (Green)
- **Team Delta** (Blue)

## How It Works

1. **Registration**: Rescuers create accounts with role set to "rescuer"
2. **Team Assignment**: Admin assigns rescuers to teams via the Admin Dashboard
3. **Dispatch**: When admin dispatches a team to an emergency:
   - Notification is sent to all team members
   - Mission details appear on the dashboard
   - Emergency location is shown on the map
4. **Mission**: Rescuers navigate to the location using the map
5. **Completion**: Admin marks mission as complete when resolved

## API Endpoints Used

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `PATCH /api/auth/profile` - Update profile
- `GET /api/rescue/my-team` - Get rescuer's team info
- `GET /api/rescue/my-mission` - Get current mission details
- `GET /api/rescue/notifications` - Get notifications
- `POST /api/rescue/push-token` - Register push notification token

## Troubleshooting

### Can't connect to backend
- Ensure backend is running on port 5000
- Check the API_BASE_URL in `src/config/api.js`
- For physical device, use your computer's IP address, not localhost

### Maps not loading
- For Android: Add your Google Maps API key in `app.json`
- Ensure location permissions are granted

### Notifications not working
- Expo push notifications require a physical device
- Ensure the Expo project ID is configured

## License

Part of the SALBA Capstone Project - Malaybalay City Emergency Response System
