# PulseArc

PulseArc is a portfolio-quality gamified social media demo built with React, Vite, TypeScript, Tailwind CSS, Firebase, React Router, React Query, Zustand, React Hook Form, Zod, Framer Motion, and Sonner.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run seed`

## Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Start the Vite app with `npm run dev`.

## Firebase

Frontend Firebase config lives in [src/firebase/config.ts](/C:/Users/revil/Documents/Programming/VSCode/social-app-demo/gameified-media-app-demo/src/firebase/config.ts).

Rules and indexes:

- [firestore.rules](/C:/Users/revil/Documents/Programming/VSCode/social-app-demo/gameified-media-app-demo/firestore.rules)
- [storage.rules](/C:/Users/revil/Documents/Programming/VSCode/social-app-demo/gameified-media-app-demo/storage.rules)
- [firestore.indexes.json](/C:/Users/revil/Documents/Programming/VSCode/social-app-demo/gameified-media-app-demo/firestore.indexes.json)

Functions scaffold:

- [functions/src/index.ts](/C:/Users/revil/Documents/Programming/VSCode/social-app-demo/gameified-media-app-demo/functions/src/index.ts)

## Demo account

- Email: `demo@pulsearc.app`
- Password: `demo-password`

## Status

This implementation establishes the full Vite architecture, routed UI shell, theme system, demo content layer, validation, rules scaffolding, tests for key logic, and a Cloud Functions starting point for trusted reward handling.
