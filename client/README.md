# Golf Charity Subscription Platform (Frontend)

React + Vite frontend for a subscription-based charity score platform.

## Tech Stack

- React (Vite)
- Tailwind CSS
- Axios
- React Router DOM
- Context API (Auth + Toast)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Set `VITE_API_BASE_URL` in `.env` to your backend URL.

3. Run development server:

```bash
npm run dev
```

## Available Routes

- `/login`
- `/signup`
- `/dashboard`
- `/scores`
- `/charity`
- `/admin`

## Features

- JWT auth with protected routes
- Dashboard overview with subscription, scores, charity, and draw status
- Score submission with `1-45` validation
- Charity selection view
- Admin draw execution and grouped winners
- Loading states, toast feedback, and empty states
