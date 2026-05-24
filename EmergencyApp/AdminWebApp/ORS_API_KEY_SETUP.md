# OpenRouteService API Key Setup

## Problem
The current ORS API key in `.env` is **rate-limited** (HTTP 429 response) or invalid. This causes routes to fail, and the app falls back to straight lines.

## Solution: Get a New OpenRouteService API Key

### Step 1: Get a Free API Key
1. Go to https://openrouteservice.org/
2. Click **"Sign Up"** (top right)
3. Create a free account
4. Once logged in, go to **Dashboard** → **API Keys**
5. Click **"Create new token"**
6. Name it (e.g., "EmergencyApp")
7. Select **"Directions"** scope
8. Copy the generated API key (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5...`)

### Step 2: Update Your .env File
1. Open `backend/.env`
2. Replace the `ORS_KEY` value with your new API key:
   ```
   ORS_KEY=your_new_api_key_here
   ```
3. **Do NOT base64 encode it** - use the plain key as provided
4. Save the file

### Step 3: Restart Backend
```bash
cd backend
node server.js
```

### Step 4: Test the Route
- In RescuerApp, dispatch a mission
- Open the mission map in the Rescuer
- The route should now show the actual shortest path instead of a straight line
- Backend logs should show: `✅ Route successfully processed!`

## Rate Limits (Free Tier)
- **Requests per day:** 2,500
- **Each route calculation:** 1 request
- If you exceed this, the app will show straight lines as fallback

## Upgrade Options
If you exceed the free tier, upgrade to:
- **Studio Plan:** 150,000 requests/month (~$49/month)
- **Enterprise:** Custom limits with dedicated support

---

## Troubleshooting

### Still showing "Route proxy error"?

Check backend logs:
```bash
[Route] ❌ INVALID API KEY - ORS_KEY is invalid or not authorized
```
→ Your API key is wrong or revoked. Get a new one from https://openrouteservice.org/dashboard

```bash
[Route] ⚠️ RATE LIMIT EXCEEDED - ORS API quota exceeded
```
→ You've exceeded the free tier limit. Upgrade or wait until tomorrow.

```bash
[Route] ✅ Route successfully processed!
```
→ It's working! Check frontend for route line on map.

## Notes
- The old key in `.env` was base64-encoded JSON, which doesn't work with ORS
- The new key should be a plain alphanumeric string
- Free tier rate limit resets daily at UTC midnight
