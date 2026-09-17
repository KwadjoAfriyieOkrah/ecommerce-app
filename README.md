# E-Commerce Portfolio Project

A full-stack e-commerce application built with a Node.js + Express backend and a React + Vite frontend.

## Stack

- Backend: Node.js, Express, PostgreSQL, JWT, bcryptjs
- Frontend: React, Vite, React Router
- Styling: Tailwind-inspired utility classes and custom responsive UI
- Deployment target: Vercel + Render + Neon/Supabase

## Project Structure

- `ecommerce-backend/` — Express API, PostgreSQL connection, auth, products, cart, orders
- `ecommerce-frontend/` — storefront frontend and protected customer flows

## Local Development

### Backend

```bash
cd ecommerce-backend
npm install
npm run dev
```

### Frontend

```bash
cd ecommerce-frontend
npm install
npm run dev
```

## Environment Setup

Copy the backend environment example and fill in your local values:

```bash
cd ecommerce-backend
copy .env.example .env
```

## Notes

This project is intended as a portfolio-ready storefront demo with a realistic product catalog, protected auth flow, cart functionality, checkout flow, and deployment-ready configuration.
