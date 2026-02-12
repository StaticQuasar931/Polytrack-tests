# Firebase setup for PolyTrack API routes

This project now includes a local same-origin API server (`server.js`) with the routes your frontend expects:

- `GET /api/lock-status`
- `POST /api/verify-local-unlock`
- `POST /api/lock`
- `GET /api/overall-leaderboard`

If you want this on Firebase (recommended for production), set up **Firebase Hosting + Cloud Functions + Firestore**.

## 1) Create Firebase project

1. Go to Firebase Console.
2. Create/select your project.
3. Enable:
   - **Firestore (Native mode)**
   - **Functions**
   - **Hosting**

## 2) Install CLI and init

```bash
npm i -g firebase-tools
firebase login
firebase init functions hosting firestore
```

Choose:
- Functions: JavaScript or TypeScript (your choice)
- Hosting public dir: `.` (or your build dir)
- Single-page app: `No` (you are serving real static files)

## 3) Hosting rewrite to same-origin API

In `firebase.json`, configure:

```json
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      }
    ]
  }
}
```

That keeps frontend calls like `/api/lock-status` same-origin.

## 4) Firestore document layout

Use this minimal schema:

- `app_state/lock`
  - `locked: boolean`
  - `updatedAt: serverTimestamp`
- `app_state/secrets`
  - `adminPasswordHash: string`
  - `localUnlockPasswordHash: string`
- `leaderboards/overall`
  - `entries: array<{ rank, name, averageRank, raceCount, totalTracks }>`
  - `updatedAt: serverTimestamp`

> Store password hashes, never plain text.

## 5) Firestore Rules (starter)

Use `firestore.rules` in this repo as your baseline.

## 6) Deploy

```bash
firebase deploy --only functions,hosting,firestore:rules
```

## 7) Environment/secrets

For Functions v2, use Secret Manager or env config for salt/pepper values used in password hashing.

## 8) What you should send me next

Send these once ready and I can wire your exact production config:

1. Firebase project ID
2. Whether you want JS or TS functions
3. Your preferred password policy (length/rotation)
4. Whether admin panel uses Firebase Auth or shared admin password only
