# Habit Reminder Backend — Step-by-Step Build Guide

> **Project:** babit-tracker-reminder  
> **Stack:** Next.js 16 + MongoDB (Mongoose) + Firebase Admin (Auth + FCM only) + Vercel Cron  
> **Estimated time:** 1–2 days (experienced) | 3–5 days (beginner)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Stage 0 — Prerequisites](#2-stage-0--prerequisites)
3. [Stage 1 — Next.js Setup & Packages](#3-stage-1--nextjs-setup--packages)
4. [Stage 2 — Firebase + MongoDB Setup](#4-stage-2--firebase--mongodb-setup)
5. [Stage 3 — Environment Variables](#5-stage-3--environment-variables)
6. [Stage 4 — Project Folder Structure](#6-stage-4--project-folder-structure)
7. [Stage 5 — Core Custom Modules](#7-stage-5--core-custom-modules)
8. [Stage 6 — API Routes](#8-stage-6--api-routes)
9. [Stage 7 — Cron Scheduler](#9-stage-7--cron-scheduler)
10. [Stage 8 — Testing](#10-stage-8--testing)
11. [Stage 9 — Deploy to Vercel](#11-stage-9--deploy-to-vercel)
12. [Package Reference (Quick List)](#12-package-reference-quick-list)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

### Problem
Flutter local notifications unreliable hain (Xiaomi, Oppo, Vivo, Huawei battery kill).

### Solution
```
Flutter App  →  Backend API  →  MongoDB (Mongoose — store schedules + tokens)
                     ↓
              Cron (every minute)
                     ↓
              Firebase FCM  →  Device push notification
```

> **Important:** Database = **MongoDB + Mongoose**. Firebase sirf **Auth token verify** aur **FCM push** ke liye — Firestore use nahi hoga.

### Notification mapping
| FCM field | Payload field   | Example                |
|-----------|-----------------|------------------------|
| Title     | `habitName`     | "Have a healthy meal"  |
| Body      | `notificationBody` | "Time for your habit" |
| Data      | `habitId`       | deep link ke liye      |

---

## 2. Stage 0 — Prerequisites

Pehle yeh confirm karo:

- [ ] Node.js 18+ installed (`node -v`)
- [ ] npm ya pnpm installed
- [ ] Git repo clone ho chuka hai
- [ ] Firebase project already exists (Flutter app FCM + Auth ke liye)
- [ ] MongoDB account (Atlas free tier) ya local MongoDB
- [ ] Flutter app mein FCM already configured hai
- [ ] Code editor (VS Code / Cursor)

**Time:** 15 minutes

---

## 3. Stage 1 — Next.js Setup & Packages

### Step 1.1 — Project already hai, sirf dependencies install karo

Project root mein jao:

```bash
cd D:\babit-tracker-reminder
npm install
```

### Step 1.2 — Backend ke liye yeh packages install karo

```bash
npm install mongoose firebase-admin zod
```

| Package          | Kyun chahiye                                      |
|------------------|---------------------------------------------------|
| `mongoose`       | MongoDB connection + schemas + CRUD               |
| `firebase-admin` | FCM push send + Auth token verify (Firestore NAHI) |
| `zod`            | Request body validation (custom rules ke liye)    |

> **Note:** `next`, `react`, `typescript` pehle se installed hain — dobara install mat karo.

### Step 1.3 — Dev mein test ke liye (optional)

```bash
npm install -D @types/node
```

`@types/node` usually pehle se hota hai — check karo `package.json` mein.

### Step 1.4 — Verify install

```bash
npm run dev
```

Browser mein `http://localhost:3000` khule — Next.js chal raha hai.

**Time:** 20 minutes

---

## 4. Stage 2 — Firebase + MongoDB Setup

### Part A — Firebase (sirf Auth + FCM)

#### Step 2.1 — Firebase Console

1. [https://console.firebase.google.com](https://console.firebase.google.com) kholo
2. Wahi project select karo jo Flutter app use karti hai
3. **Project Settings** → **Service accounts** tab
4. **Generate new private key** → JSON file download karo
5. Is file ko safe rakho — git mein **kabhi commit mat karo**

> Firestore enable karne ki **zaroorat nahi** — database MongoDB hoga.

**Time:** 15 minutes

---

### Part B — MongoDB (Mongoose database)

#### Step 2.2 — MongoDB Atlas setup (recommended)

1. [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) pe account banao
2. **Create cluster** → Free tier (M0) select karo
3. **Database Access** → user banao (username + password)
4. **Network Access** → IP allow karo (`0.0.0.0/0` dev ke liye; production mein restrict karo)
5. **Connect** → **Drivers** → connection string copy karo:

```
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/habit-reminder?retryWrites=true&w=majority
```

#### Step 2.3 — Local MongoDB (alternative)

Agar local chalana ho:

```bash
# Docker se
docker run -d -p 27017:27017 --name mongo mongo:7
```

Connection string:
```
mongodb://localhost:27017/habit-reminder
```

#### Step 2.4 — Mongoose collections (schemas)

Backend yeh **2 Mongoose models** use karega:

**User** — FCM device tokens store karo
```typescript
{
  userId: string,        // Firebase Auth uid (unique, indexed)
  fcmTokens: string[],   // device tokens array
  updatedAt: Date
}
```

**Reminder** — habit schedules store karo
```typescript
{
  userId: string,              // Firebase Auth uid (indexed)
  habitId: string,             // unique per user (compound index)
  habitName: string,           // FCM title
  notificationBody: string,    // FCM body
  days: string[],
  timer: boolean,
  repeat: boolean,
  time?: string,
  startTime?: string,
  endTime?: string,
  repeatCount?: number,
  scheduledTimes: string[],    // calculated fire times
  updatedAt: Date
}
```

**Indexes (important for cron speed):**
- `Reminder`: compound unique `{ userId, habitId }`
- `Reminder`: `{ scheduledTimes: 1, days: 1 }` — due reminders fast fetch

**Time:** 30 minutes

---

## 5. Stage 3 — Environment Variables

### Step 3.1 — `.env.local` file banao (project root)

```env
# MongoDB — Atlas ya local connection string
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/habit-reminder?retryWrites=true&w=majority

# Firebase Admin — service account JSON se (Auth + FCM only)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cron security — koi bhi random long string
CRON_SECRET=your-random-secret-string-min-32-chars
```

> **Tip:** Private key mein `\n` literal newlines hon — JSON file se copy karte waqt `\n` escape characters use karo.

### Step 3.2 — `.gitignore` check

`.env*` already gitignore mein hona chahiye — verify karo.

**Time:** 10 minutes

---

## 6. Stage 4 — Project Folder Structure

Yeh folders/files banao:

```
src/
├── app/
│   └── api/
│       ├── habits/
│       │   └── reminder/
│       │       ├── route.ts              ← POST upsert, DELETE
│       │       └── bulk/
│       │           └── route.ts          ← POST bulk array
│       └── cron/
│           └── reminders/
│               └── route.ts              ← GET (Vercel Cron hits this)
├── lib/
│   ├── db.ts                             ← Mongoose connect (cached)
│   ├── firebase-admin.ts                 ← Firebase init (Auth + FCM only)
│   ├── auth.ts                           ← Bearer token → userId
│   ├── validation.ts                     ← Zod schemas
│   ├── schedule.ts                       ← repeat time calculator
│   ├── reminders.ts                      ← Mongoose CRUD
│   └── fcm.ts                            ← send push + dead token cleanup
└── models/
    ├── User.ts                           ← Mongoose User schema
    └── Reminder.ts                       ← Mongoose Reminder schema
```

### File creation order (recommended)

1. `lib/db.ts` — MongoDB connection
2. `models/User.ts` + `models/Reminder.ts`
3. `lib/firebase-admin.ts`
4. `lib/auth.ts`
5. `lib/validation.ts`
6. `lib/schedule.ts`
7. `lib/reminders.ts`
8. `lib/fcm.ts`
9. API routes (last)

**Time:** 15 minutes (skeleton only)

---

## 7. Stage 5 — Core Custom Modules

Har file ka kaam — yeh **custom code** hai, packages nahi.

### Step 5.1 — `lib/db.ts`

**Kaam:** Mongoose connection ek baar connect karo (Next.js hot-reload safe).

```typescript
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
let cached = global.mongoose ?? { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

**Time:** 15 minutes

---

### Step 5.2 — `models/User.ts` + `models/Reminder.ts`

**Kaam:** Mongoose schemas define karo (Stage 2.4 wala structure).

```typescript
// models/Reminder.ts — example
import { Schema, model, models } from "mongoose";

const ReminderSchema = new Schema({
  userId: { type: String, required: true, index: true },
  habitId: { type: String, required: true },
  habitName: { type: String, required: true },
  notificationBody: { type: String, required: true },
  days: [{ type: String, required: true }],
  timer: { type: Boolean, required: true },
  repeat: { type: Boolean, required: true },
  time: String,
  startTime: String,
  endTime: String,
  repeatCount: Number,
  scheduledTimes: [{ type: String, required: true }],
}, { timestamps: true });

ReminderSchema.index({ userId: 1, habitId: 1 }, { unique: true });

export const Reminder = models.Reminder ?? model("Reminder", ReminderSchema);
```

**Time:** 30 minutes

---

### Step 5.3 — `lib/firebase-admin.ts`

**Kaam:** Firebase Admin SDK — sirf Auth + Messaging. **Firestore import mat karo.**

```typescript
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

function initFirebase() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return { auth: getAuth(), messaging: getMessaging() };
}

export const { auth, messaging } = initFirebase();
```

**Time:** 15 minutes

---

### Step 5.4 — `lib/auth.ts`

**Kaam:** `Authorization: Bearer <token>` se user id nikalo.

```typescript
import { auth } from "./firebase-admin";
import { NextRequest } from "next/server";

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
```

**Time:** 15 minutes

---

### Step 5.5 — `lib/validation.ts`

**Kaam:** Request body validate karo (Zod).

Rules:
- `timer` aur `repeat` — exactly ek `true`
- `habitName` — non-empty (FCM title)
- `notificationBody` — non-empty (FCM body)
- `time` / `startTime` / `endTime` — `"HH:mm"` format
- `repeatCount >= 1`
- `startTime < endTime`
- `days` — kam az kam ek valid day

**Time:** 45 minutes

---

### Step 5.6 — `lib/schedule.ts`

**Kaam:** Repeat mode ke fire times calculate karo.

Formula:
```
gap = (endTime - startTime) / (repeatCount - 1)   // repeatCount > 1
```

Example: `09:00` → `21:00`, `repeatCount = 4`  
Result: `["09:00", "13:00", "17:00", "21:00"]`

Edge case: `repeatCount === 1` → sirf `["startTime"]`

**Time:** 30 minutes

---

### Step 5.7 — `lib/reminders.ts`

**Kaam:** Mongoose CRUD (Firestore nahi).

Functions:
- `upsertReminder(userId, payload)` — `findOneAndUpdate` with `{ upsert: true }`
- `deleteReminder(userId, habitId)` — `deleteOne`
- `bulkUpsertReminders(userId, payloads[])` — loop upsert
- `getDueReminders(now: Date)` — query: `scheduledTimes` contains current `HH:mm` AND today in `days`

Example upsert:
```typescript
await Reminder.findOneAndUpdate(
  { userId, habitId: payload.habitId },
  { ...payload, userId, scheduledTimes },
  { upsert: true, new: true }
);
```

**Time:** 1 hour

---

### Step 5.8 — `lib/fcm.ts`

**Kaam:** Push notification bhejo.

```typescript
// Title = habitName
// Body  = notificationBody
// Data  = { habitId }

await messaging.send({
  token: fcmToken,
  notification: {
    title: reminder.habitName,
    body: reminder.notificationBody,
  },
  data: { habitId: reminder.habitId },
});
```

Dead token: error code `messaging/registration-token-not-registered` → token **MongoDB User document** se hatao (`$pull` on `fcmTokens`).

**Time:** 30 minutes

---

**Stage 5 Total Time:** ~4 hours

---

## 8. Stage 6 — API Routes

Har route pehle `connectDB()` call karega.

### Step 6.1 — `POST /api/habits/reminder`

**Flow:**
1. `connectDB()`
2. Auth token verify → userId
3. Body validate (Zod)
4. scheduledTimes calculate (`schedule.ts`)
5. Mongoose upsert
6. Response: `{ success, habitId, scheduledTimes }`

### Step 6.2 — `DELETE /api/habits/reminder/[habitId]`

**Flow:**
1. `connectDB()`
2. Auth → userId
3. MongoDB se delete
4. Response: `{ success: true }`

### Step 6.3 — `POST /api/habits/reminder/bulk`

**Flow:**
1. `connectDB()`
2. Auth → userId
3. Array validate — har item individually
4. Har item upsert (same as single)
5. Response: array of results

**Time:** 2 hours

---

## 9. Stage 7 — Cron Scheduler

### Step 7.1 — `GET /api/cron/reminders/route.ts`

**Flow (har minute):**
1. `CRON_SECRET` header verify karo
2. `connectDB()`
3. Ab ka time nikalo (`HH:mm`)
4. Aaj ka day name nikalo (`Monday`, etc.)
5. MongoDB se due reminders fetch karo (`Reminder.find(...)`)
6. Har reminder ke liye `User` se FCM tokens lo
7. Push bhejo
8. Dead tokens MongoDB se cleanup

### Step 7.2 — `vercel.json` mein cron add karo

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "* * * * *"
    }
  ]
}
```

> Vercel Hobby plan pe cron limited ho sakta hai — Pro plan pe har minute reliable hai.

**Time:** 1.5 hours

---

## 10. Stage 8 — Testing

### Step 8.1 — Local API test (Postman / curl)

```bash
# Single habit upsert
curl -X POST http://localhost:3000/api/habits/reminder \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "habitId": "test123",
    "habitName": "Have a healthy meal",
    "notificationBody": "Time for your habit",
    "days": ["Everyday"],
    "timer": true,
    "repeat": false,
    "time": "08:00"
  }'
```

Expected response:
```json
{
  "success": true,
  "habitId": "test123",
  "scheduledTimes": ["08:00"]
}
```

### Step 8.2 — MongoDB verify

Atlas Dashboard → Browse Collections → `reminders` collection mein document dikhna chahiye.

### Step 8.3 — Repeat mode test

```bash
curl -X POST http://localhost:3000/api/habits/reminder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "habitId": "stretch1",
    "habitName": "Stretch",
    "notificationBody": "Time for your habit",
    "days": ["Monday", "Wednesday", "Friday"],
    "timer": false,
    "repeat": true,
    "startTime": "09:00",
    "endTime": "21:00",
    "repeatCount": 4
  }'
```

Expected: `"scheduledTimes": ["09:00", "13:00", "17:00", "21:00"]`

### Step 8.4 — Cron manually trigger (local)

```bash
curl http://localhost:3000/api/cron/reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Step 8.5 — Real device test

1. Flutter app se FCM token backend pe save karo (User collection)
2. Reminder time ab se 2 minute baad set karo
3. Cron chalao ya wait karo
4. Phone pe notification aani chahiye:
   - Title: habit name
   - Body: notification body

**Time:** 1–2 hours

---

## 11. Stage 9 — Deploy to Vercel

### Step 9.1 — Vercel account + project link

```bash
npm install -g vercel
vercel login
vercel
```

### Step 9.2 — Environment variables Vercel pe set karo

Vercel Dashboard → Project → Settings → Environment Variables:

- `MONGODB_URI`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `CRON_SECRET`

### Step 9.3 — MongoDB Atlas IP whitelist

Atlas → Network Access → Vercel ke liye `0.0.0.0/0` allow karo (ya Vercel static IPs agar Pro plan ho).

### Step 9.4 — Deploy

```bash
vercel --prod
```

### Step 9.5 — Cron verify

Vercel Dashboard → Project → Cron Jobs — `/api/cron/reminders` har minute dikhna chahiye.

**Time:** 30 minutes

---

## 12. Package Reference (Quick List)

### Install karna hai (backend ke liye)

```bash
npm install mongoose firebase-admin zod
```

### Pehle se hai (install mat karo)

| Package    | Version | Kaam              |
|------------|---------|-------------------|
| `next`     | 16.x    | API routes server |
| `react`    | 19.x    | (frontend, optional)|
| `typescript` | 5.x  | Type safety       |

### Install NAHI karna

| Package        | Kyun nahi                           |
|----------------|-------------------------------------|
| `node-cron`    | Vercel serverless pe unreliable     |
| `express`      | Next.js API routes already hain     |
| `firebase/firestore` | MongoDB use kar rahe hain     |
| `jsonwebtoken` | Firebase Admin verify karega        |
| `axios`        | Native `fetch` kaafi hai            |

---

## 13. Troubleshooting

| Problem | Solution |
|---------|----------|
| `401 Unauthorized` | Firebase ID token expire ho gaya — naya token lo |
| MongoDB connection fail | `MONGODB_URI` check karo; Atlas IP whitelist verify karo |
| `E11000 duplicate key` | Same `userId + habitId` — upsert use karo, insert nahi |
| FCM token invalid | App reinstall ke baad naya token MongoDB User mein save karo |
| Cron nahi chal raha | Vercel plan check karo; `CRON_SECRET` header verify karo |
| Notification nahi aayi | Device internet check; FCM token MongoDB `users` collection mein hai? |
| `privateKey` error | `.env.local` mein `\n` escape characters theek karo |
| Wrong scheduled times | Timezone — server UTC use karta hai, user timezone handle karo |

---

## Build Timeline Summary

| Stage | Kaam | Time |
|-------|------|------|
| 0 | Prerequisites | 15 min |
| 1 | Packages install | 20 min |
| 2 | Firebase + MongoDB setup | 45 min |
| 3 | Env variables | 10 min |
| 4 | Folder structure | 15 min |
| 5 | Core custom modules | 4 hrs |
| 6 | API routes | 2 hrs |
| 7 | Cron scheduler | 1.5 hrs |
| 8 | Testing | 1–2 hrs |
| 9 | Deploy | 30 min |
| **Total** | | **~10–12 hrs (1–2 din)** |

---

## Next Step

Stage 1 se shuru karo:

```bash
cd D:\babit-tracker-reminder
npm install mongoose firebase-admin zod
```

Phir Stage 2 — MongoDB Atlas cluster banao + Firebase service account key download karo.

---

*Generated for babit-tracker-reminder project — Aug 2026*
