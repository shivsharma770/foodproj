# 🍽️ Food Rescue Platform

A web application connecting restaurants with surplus food to volunteer organizations, reducing food waste and helping communities in need.

![Status](https://img.shields.io/badge/status-demo--ready-brightgreen)
![Node](https://img.shields.io/badge/node-18%2B-blue)
![React](https://img.shields.io/badge/react-18-61dafb)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [User Roles](#user-roles)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Demo Mode](#demo-mode)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Workflow](#workflow)

---

## Overview

Food Rescue Platform streamlines the process of rescuing surplus food from restaurants before it goes to waste. Restaurants can post available food, volunteers can claim and pick up donations, and administrators manage the entire ecosystem.

### Key Benefits
- 🌱 **Reduce Food Waste** - Connect surplus food with those who need it
- 🤝 **Community Building** - Bridge restaurants and volunteer organizations
- 📊 **Track Impact** - Monitor donations and pickups
- 💬 **Real-time Communication** - Built-in messaging between parties

---

## Features

### For Restaurants
- ✅ Post food offers with quantity, type, and expiry details
- ✅ View and manage all active offers
- ✅ Approve or decline volunteer pickup requests
- ✅ Confirm when food has been picked up
- ✅ Chat with assigned volunteers
- ✅ Track donation history

### For Volunteers
- ✅ Browse available food offers
- ✅ Claim offers for pickup
- ✅ View pickup details and restaurant location
- ✅ Communicate with restaurants via chat
- ✅ Mark pickups as complete
- ✅ Track pickup history

### For Administrators
- ✅ One-time admin registration (first admin only)
- ✅ Pre-approve and create restaurant/volunteer accounts
- ✅ Manage all users (view, suspend, delete)
- ✅ Monitor platform activity

---

## User Roles

| Role | Description | Access | Created By |
|------|-------------|--------|------------|
| **Master Admin** 👑 | Platform administrator | User management, system oversight | Self-registration (one-time) |
| **Org Admin** 🏢 | Organization manager | Manage volunteers in their org | Master Admin |
| **Restaurant** 🏪 | Food donors | Create offers, approve pickups | Master Admin |
| **Volunteer** 🚗 | Food rescuers | Claim offers, handle pickups | Org Admin |

### Role Hierarchy
```
👑 Master Admin
    ├── 🏢 Org Admin → 🚗 Volunteers (in their organization)
    └── 🏪 Restaurant
```

### Authentication Flow
1. **Master Admin Setup** - First user registers as master admin (one-time)
2. **Org Admin Creation** - Master admin creates organizational admin accounts
3. **Restaurant Creation** - Master admin creates restaurant accounts
4. **Volunteer Creation** - Org admins create volunteer accounts for their organization
5. **First Login** - New users change password and complete profile setup
6. **Normal Access** - Users log in and access their dashboards

---

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd foodproj
   ```

2. **Install backend dependencies**
   ```bash
   cd foodproj/backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../web
   npm install
   ```

---

## Running the Application

### Start Backend Server
```bash
cd foodproj/backend
npm run dev
```
Backend runs on: `http://localhost:3002`

### Start Frontend Development Server
```bash
cd foodproj/web
npm run dev
```
Frontend runs on: `http://localhost:3000`

### Quick Start (Both Servers)
Open two terminal windows and run each command:

**Terminal 1 - Backend:**
```bash
cd foodproj/backend && npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd foodproj/web && npm run dev
```

---

## Demo Mode

The application runs in **demo mode** by default, which:
- Uses in-memory data storage (no database required)
- Persists data to `.demo-data.json` file across server restarts
- Requires no Firebase configuration

### Demo Mode Features
- ✅ Full functionality without external services
- ✅ Data persists between server restarts
- ✅ Perfect for development and testing

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3002
FORCE_DEMO=true
```

**Frontend** (`web/.env`):
```env
VITE_API_URL=http://localhost:3002
VITE_FORCE_DEMO=true
```

---

## Project Structure

```
foodproj/
├── backend/                 # Express.js API server
│   ├── config/
│   │   └── firebase.js      # Firebase configuration
│   ├── middleware/
│   │   └── auth.js          # Authentication middleware
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── foodOffers.js    # Food offer management
│   │   ├── messages.js      # Chat/messaging
│   │   ├── pickups.js       # Pickup management
│   │   └── volunteers.js    # Volunteer endpoints
│   ├── demoStore.js         # In-memory data store
│   └── index.js             # Server entry point
│
├── web/                     # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── OfferCard.jsx
│   │   │   └── ...
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx   # Authentication state
│   │   ├── pages/           # Route pages
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminSetupPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── OnboardingPage.jsx
│   │   │   ├── RestaurantDashboard.jsx
│   │   │   ├── VolunteerDashboard.jsx
│   │   │   └── ...
│   │   └── config/
│   │       ├── api.js       # API utilities
│   │       └── firebase.js  # Firebase config
│   └── index.html
│
└── shared/                  # Shared constants
    ├── types.js             # User roles, statuses
    └── validation.js        # Input validation
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/auth/admin-exists` | Check if admin is registered |
| POST | `/auth/admin/register` | Register first admin |
| POST | `/auth/admin/login` | Admin login |
| POST | `/auth/login` | Restaurant/Volunteer login |
| POST | `/auth/change-password` | Change password |
| POST | `/auth/complete-onboarding` | Complete profile setup |
| GET | `/auth/me` | Get current user profile |

### Admin Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/admin/users` | List all users |
| POST | `/auth/admin/create-user` | Create new user account |
| POST | `/auth/admin/suspend-user` | Suspend a user |
| POST | `/auth/admin/unsuspend-user` | Reactivate a user |
| DELETE | `/auth/admin/delete-user/:id` | Delete a user |

### Food Offers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/food_offers` | List all offers |
| GET | `/food_offers/:id` | Get offer details |
| POST | `/food_offers` | Create new offer |
| PUT | `/food_offers/:id` | Update offer |
| DELETE | `/food_offers/:id` | Delete offer |
| POST | `/food_offers/:id/claim` | Claim an offer |
| POST | `/food_offers/:id/confirm` | Confirm pickup request |
| POST | `/food_offers/:id/reject` | Reject pickup request |
| POST | `/food_offers/:id/cancel` | Cancel claim |
| POST | `/food_offers/:id/complete` | Mark pickup complete |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages/:pickupId` | Get messages for pickup |
| POST | `/messages/:pickupId` | Send a message |

---

## Workflow

### Complete Food Rescue Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   RESTAURANT    │     │    VOLUNTEER    │     │     ADMIN       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       │     Creates Account   │
         │◄──────────────────────┼───────────────────────┤
         │                       │                       │
    Posts Offer                  │                       │
         │                       │                       │
         │    Views Available    │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
         │     Claims Offer      │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
  Confirms/Rejects               │                       │
         │──────────────────────►│                       │
         │                       │                       │
         │◄─────Chat─────────────►                       │
         │                       │                       │
         │   Picks Up Food       │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
  Marks Complete                 │                       │
         │──────────────────────►│                       │
         │                       │                       │
         ▼                       ▼                       ▼
```

### Offer Statuses

| Status | Description |
|--------|-------------|
| `OPEN` | Available for volunteers to claim |
| `CLAIMED` | Volunteer has requested pickup, awaiting restaurant approval |
| `CONFIRMED` | Restaurant approved, pickup scheduled |
| `COMPLETED` | Food has been picked up |
| `CANCELLED` | Offer or claim was cancelled |
| `EXPIRED` | Offer expired before pickup |

---

## 🎨 Tech Stack

- **Frontend**: React 18, Tailwind CSS, React Router
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore (or demo mode in-memory)
- **Authentication**: Custom JWT (demo) / Firebase Auth (production)
- **Build Tools**: Vite

---

## 🚀 Production Deployment (Firebase)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Create **Firestore Database** in production mode

### Step 2: Get Firebase Credentials

**Frontend Config:**
- Project Settings → General → Your apps → Add Web app
- Copy the config object

**Backend Service Account:**
- Project Settings → Service accounts → Generate new private key
- Download the JSON file

### Step 3: Configure Environment Variables

**Frontend** (`web/.env`):
```env
VITE_API_URL=https://your-backend-url.com
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Backend** (`backend/.env`):
```env
PORT=3002
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

Or for cloud deployment (Railway, Render, etc.):
```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

### Step 4: Deploy

**Backend** (Railway/Render/Heroku):
```bash
cd backend
npm install
npm start
```

**Frontend** (Vercel/Netlify):
```bash
cd web
npm install
npm run build
# Deploy the dist/ folder
```

### Recommended Hosting

| Service | Best For | Free Tier |
|---------|----------|-----------|
| **Vercel** | Frontend | ✅ Yes |
| **Railway** | Backend | ✅ $5 credit |
| **Render** | Backend | ✅ Yes |
| **Firebase Hosting** | Frontend | ✅ Yes |

---

## 📝 Notes

- Demo data is stored in `backend/.demo-data.json` (git-ignored)
- To reset demo data, delete `.demo-data.json` and restart the server
- The first user to register becomes the admin

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  <strong>🌱 Reducing food waste, one rescue at a time 🌱</strong>
</div>


