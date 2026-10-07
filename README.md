<div align="center">

<img src="randezy_logo.png" alt="Randezy" width="120" />

# Randezy

**Online booking and business management platform for hair salons, barbers, beauty centers, spas and massage studios**

Customers discover businesses near them and book appointments online, 24/7.
Business owners manage their calendar, staff, campaigns and revenue from the web dashboard and the **Randezy İşletme** mobile app.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

</div>

---

## Table of Contents

- [Randezy İşletme Mobile App](#-randezy-i̇şletme-mobile-app)
- [Web Platform](#-web-platform)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Security](#-security)

---

## 📱 Randezy İşletme Mobile App

**Randezy İşletme** ("Randezy Business") is an iOS and Android app that lets business owners and their staff run the salon from their phone. It is built with Expo (React Native) and shares the same Supabase database as the web dashboard, so every change shows up on both sides instantly.

> The app's interface is in Turkish.

<table>
  <tr>
    <td align="center" width="20%"><img src="mobile/store-assets/screenshots/tr/mkt_01_home.png" alt="Home" /></td>
    <td align="center" width="20%"><img src="mobile/store-assets/screenshots/tr/mkt_02_calendar.png" alt="Calendar" /></td>
    <td align="center" width="20%"><img src="mobile/store-assets/screenshots/tr/mkt_03_finance.png" alt="Finance" /></td>
    <td align="center" width="20%"><img src="mobile/store-assets/screenshots/tr/mkt_04_campaigns.png" alt="Campaigns" /></td>
    <td align="center" width="20%"><img src="mobile/store-assets/screenshots/tr/mkt_05_profile.png" alt="Settings" /></td>
  </tr>
  <tr>
    <td align="center"><b>Home</b><br/><sub>Today at a glance</sub></td>
    <td align="center"><b>Calendar</b><br/><sub>Weekly schedule</sub></td>
    <td align="center"><b>Finance</b><br/><sub>Revenue reports</sub></td>
    <td align="center"><b>Campaigns</b><br/><sub>Customer loyalty</sub></td>
    <td align="center"><b>Settings</b><br/><sub>Auto-approval</sub></td>
  </tr>
</table>

### Key Features

| | Feature | Description |
|---|---|---|
| 🏠 | **Home** | Today's revenue, total / completed / upcoming appointment counts, a card for the next customer (call, message, mark as no-show) and the day's schedule |
| 📅 | **Calendar** | Day, Week, Month, Staff and List views; weekly summary (this week / pending / confirmed), current-time indicator, staff filter and appointment search |
| ➕ | **Quick Booking** | The center button in the tab bar creates a new appointment in seconds, including walk-in customers; extra services and products can be added to an appointment |
| 💰 | **Finance** | Weekly / monthly / yearly revenue, completed, cancelled and no-show counts, average ticket, cancellation loss, daily revenue chart, staff performance and revenue by service |
| 🏪 | **Business Management** | Manage services, staff, opening hours and campaigns from one screen |
| 🎯 | **Campaigns** | Create percentage-discount campaigns with a date range, preview discounted prices, activate or pause campaigns |
| ✅ | **Auto-Approval** | When enabled, new bookings are confirmed automatically with no manual approval |
| ⭐ | **Reviews** | View customer reviews of the business |
| 🔔 | **Push Notifications** | Notifications for new bookings and status changes (Expo Notifications) |
| 👥 | **Staff Login** | Staff sign in with an access code issued by the business and see only their own calendar |
| 🍎 | **Sign in with Apple** | Apple sign-in alongside email / password |

### App Screens

```
mobile/screens/
├── LoginScreen.tsx          → Owner login (email, Apple)
├── StaffLoginScreen.tsx     → Staff login with access code
├── StaffCalendarScreen.tsx  → Staff member's own calendar
├── HomeScreen.tsx           → Daily summary and schedule
├── CalendarScreen.tsx       → Day / Week / Month / Staff / List views
├── AppointmentsScreen.tsx   → Appointment list
├── FinanceScreen.tsx        → Revenue and performance reports
├── BusinessScreen.tsx       → Services, Staff, Hours, Campaigns
├── ReviewsScreen.tsx        → Customer reviews
└── SettingsScreen.tsx       → Business info, auto-approval, notifications
```

---

## 🌐 Web Platform

The Next.js web app serves both customers and business owners.

### For Customers
- **Business discovery** — search and filter by name, category, city and district
- **Business page** — services, prices, example photos, opening hours, location and Google reviews
- **Online booking** — pick a service, staff member, date and time; guest booking without an account is supported
- **My Appointments** and **My Account** pages
- **Gift cards** and promo codes

### For Business Owners
- **`/pro`** — landing and pricing page for businesses
- **`/isletme-ekle`** — 4-step business onboarding (details → legal info → service menu → opening hours)
- **`/dashboard`** — manage appointments, services, staff, opening hours, campaigns and business details
- **`/b/[slug]`** — shareable booking link for each business
- **Subscriptions** — payments and subscription management with Stripe
- **Notifications** — appointment reminders by email (Resend), status updates by SMS (Netgsm)

### Supported Categories
Hair Salon · Barber · Beauty Center · Nails · Physiotherapy · Brows & Lashes · Massage · Tattoo

---

## 🏗 Architecture

```
  ┌──────────────────────┐        ┌───────────────────────────┐
  │   Web (Next.js 16)   │        │ Randezy İşletme (Expo 54) │
  │ Customers + Business │        │     iOS / Android app     │
  └─────┬──────────┬─────┘        └─────┬──────────────┬──────┘
        │          │                    │              │
        │   ┌──────▼────────────────────▼──┐           │
        │   │  Supabase                    │           │
        │   │  Auth · PostgreSQL · Storage │◄──────────┘
        │   │  RLS policies                │
        │   └──────────────▲───────────────┘
        │                  │
  ┌─────▼──────────────────┴─────┐
  │  Next.js API Routes          │   Stripe · Resend · Netgsm
  │  + FastAPI Backend (Vercel)  │   Google Places · Expo Push
  └──────────────────────────────┘
```

- **Supabase** is the core for authentication, database and file storage. Row Level Security is enabled on every table.
- **Next.js API routes** handle notifications, payments, scheduled reminders (cron), staff login and admin operations on the server.
- **The FastAPI backend** provides appointment, business and user endpoints, plus push notification and email delivery.

---

## 📂 Project Structure

```
randezy/
├── frontend/      → Next.js 16 web app (App Router)
│   ├── app/       → Pages and API routes
│   ├── components/
│   └── lib/
├── mobile/        → Randezy İşletme — Expo / React Native app
│   ├── screens/
│   ├── components/   (calendar, modals)
│   ├── contexts/ hooks/ services/ lib/
│   └── store-assets/ → App Store / Play Store images
├── backend/       → FastAPI service (routers, alembic, tests)
└── supabase/      → SQL migrations and RLS policies
```

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Mobile** | Expo SDK 54, React Native 0.81, React 19, TypeScript, React Navigation 7, Expo Notifications, Apple Authentication |
| **Web** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Hook Form + Zod, Motion, Lucide |
| **Backend** | FastAPI, SQLAlchemy, Alembic, Pydantic, python-jose, Pytest |
| **Data & Infra** | Supabase (Auth, PostgreSQL, Storage), Vercel, EAS Build |
| **Integrations** | Stripe, Resend, Netgsm, Google Places, Expo Push |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+ (for the backend)
- A Supabase project
- For mobile: an Expo account and the [EAS CLI](https://docs.expo.dev/build/setup/)

### 1. Database

Run the SQL files in the `supabase/` folder from the Supabase SQL Editor (including `rls_policies.sql`).

### 2. Web (frontend)

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Optional integrations
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
GOOGLE_PLACES_API_KEY=
NETGSM_USERCODE=
NETGSM_PASSWORD=
NETGSM_HEADER=
CRON_SECRET=
ADMIN_EMAILS=
SITE_OPEN=1
```

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

> **Note:** The site is currently closed by default. Set `SITE_OPEN=1` to open it locally or in production (see `frontend/proxy.ts`).

### 3. Mobile app

Connection settings live in `mobile/config.ts`.

```bash
cd mobile
npm install
npx expo start             # Dev server
npm run ios                # iOS (development build)
npm run android            # Android (development build)
```

Store builds:

```bash
eas build --platform ios       # or android
```

### 4. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
pytest                         # tests
```

---

## 🔒 Security

- **RLS** enabled on every Supabase table
- `/api/notify` requires authentication and an `appointmentId`; data is read directly from the database
- `/api/cron/reminders` only runs with `CRON_SECRET`
- The storage bucket allows uploads (INSERT) only
- KVKK (Turkish data protection law), terms of use and marketing consents are recorded

---

<div align="center">
<sub>Randezy — Manage all your appointments from a single screen.</sub>
</div>
