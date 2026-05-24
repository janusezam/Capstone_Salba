# Google OAuth Setup Guide

## Overview
The authentication system now supports Google OAuth for both Login and Register pages. Users can sign in/register with their Google account with a single click.

## Prerequisites

1. **Google Cloud Project** - Create one at [Google Cloud Console](https://console.cloud.google.com/)
2. **OAuth 2.0 Credentials** - Create OAuth 2.0 Client IDs for your application

## Setup Steps

### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized origins and redirects:
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (development)
     - Your production domain (when deployed)
   - **Authorized redirect URIs:**
     - `http://localhost:3000/` (development)
     - Your production domain redirect URI

7. Copy the **Client ID** (you'll need this)

### Step 2: Configure Backend (.env)

Add to your backend `.env` file:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_uri
```

**Example:**
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
JWT_SECRET=your_secret_key_here
MONGODB_URI=mongodb://localhost:27017/salba
```

### Step 3: Configure Frontend (.env.local)

Create a `.env.local` file in the `frontend/` directory:

```env
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

**Example:**
```env
REACT_APP_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

### Step 4: Test the Integration

1. **Start Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend Server** (in a new terminal):
   ```bash
   cd frontend
   npm start
   ```

3. **Test Google Login:**
   - Navigate to `http://localhost:3000/login`
   - Click the Google button
   - Sign in with a Google account
   - You should be redirected to the dashboard

4. **Test Google Register:**
   - Navigate to `http://localhost:3000/register`
   - Click the Google button
   - Sign up with a Google account
   - New user should be created automatically

## How It Works

### Frontend Flow:
1. User clicks "Sign in/up with Google" button
2. Google OAuth login popup appears
3. User authenticates with Google
4. Google returns a credential token to the frontend
5. Frontend sends the token to the backend's `/auth/google-login` endpoint
6. Backend verifies the token and creates/finds the user
7. Backend returns a JWT token
8. Frontend stores token and redirects to dashboard

### Backend Flow:
1. Receives the Google credential token
2. Verifies the token using `google-auth-library`
3. Extracts user info (email, name, picture)
4. Checks if user exists in database
5. If not, creates new user with role "user" (or "admin" if email is admin@relief.com)
6. Returns JWT and user info

## Environment Variables Explained

| Variable | Location | Purpose |
|----------|----------|---------|
| `GOOGLE_CLIENT_ID` | Backend `.env` | Server-side verification of Google tokens |
| `REACT_APP_GOOGLE_CLIENT_ID` | Frontend `.env.local` | Client-side Google login initiation |
| `JWT_SECRET` | Backend `.env` | Signing and verifying JWT tokens |

## Security Notes

- **Never commit** `.env` or `.env.local` files to version control
- Store credentials securely in environment variables
- Google Client Secret is NOT needed for web applications using OAuth 2.0 with JWT verification
- Tokens automatically expire after 7 days
- Always validate tokens on the backend before granting access

## Troubleshooting

### Google button not showing:
- Check `REACT_APP_GOOGLE_CLIENT_ID` is set in `.env.local`
- Restart frontend server after setting environment variables
- Check browser console for errors

### "Invalid credential" error:
- Verify `GOOGLE_CLIENT_ID` matches in both frontend and backend
- Check authorized origins in Google Cloud Console
- Ensure backend can reach Google servers

### User not created:
- Check MongoDB connection
- Verify JWT_SECRET is set in backend
- Check server logs for detailed error messages

## Testing with Test Accounts

You can use any Google account to test. Create a test Google account specifically for development:

1. Go to [google.com/accounts](https://google.com/accounts)
2. Create a new account
3. Use it to test login/registration flows

## Role Assignment

- **Admin**: Email must be exactly `admin@relief.com`
- **Rescuer**: Can only be created by admin manually
- **User**: Default role for all Google OAuth signups

## Next Steps

1. Test the complete flow locally
2. Deploy to production with your domain
3. Update authorized origins in Google Cloud Console for production
4. Monitor authentication logs

---

For more info on Google OAuth: [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
