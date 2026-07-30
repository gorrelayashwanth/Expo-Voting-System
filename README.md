TrustPoll

A cluster-based, fault-tolerant live voting and polling system built to demonstrate real-world distributed systems concepts — server clustering, AI-assisted load balancing, and automatic failover — running live across three laptops.

Built as a Network Expo project to showcase how distributed architecture principles (the kind that power real production systems) can be applied to something as simple as a poll, made robust, fraud-resistant, and self-healing.

🔗 Live Demo: trustpoll.pages.dev · Admin Panel: trustpoll.pages.dev/admin

✨ Highlights
Server Clustering — Multiple backend nodes running across separate machines, coordinated as a single logical cluster.
AI-Assisted Load Balancing — Uses rolling-average anomaly detection to route traffic intelligently and flag abnormal load patterns in real time.
Fault Tolerance — The system keeps serving votes even if one node goes down, with automatic recovery handling.
Four-Layer Anti-Fraud System — Combines device fingerprinting, request pattern analysis, and rate-limiting layers to prevent duplicate or bot voting.
Live Admin Dashboard — One-click project reset, full poll CRUD, and real-time results — no page refresh needed.
Built-in NLP Chatbot — A rule-based assistant on the dashboard to help admins navigate the system and answer common questions.
Public Access via Cloudflare Tunnel — Exposes the local cluster securely to the internet without complex networking setup.
🧱 Tech Stack
Layer	Technology
Backend	Node.js, Express
Database	PostgreSQL + Prisma ORM
Frontend	React, Vite, Tailwind CSS
Anti-Fraud	FingerprintJS
Networking	Cloudflare Tunnel
Deployment	Cloudflare Pages
🏗️ Architecture

TrustPoll runs as a distributed cluster of Express servers, each hosted on a separate laptop, coordinating over the network to share load and vote data consistently. A rolling-average anomaly detector continuously monitors request patterns per node and reroutes traffic away from overloaded or misbehaving nodes — simulating the kind of AI-assisted load balancing used in production-grade distributed systems.

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Node 1    │     │   Node 2    │     │   Node 3    │
│  (Express)  │◄───►│  (Express)  │◄───►│  (Express)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────┬───────┴───────────┬───────┘
                    │                   │
             ┌──────▼──────┐     ┌──────▼──────┐
             │  PostgreSQL │     │ Load Balancer│
             │  (Prisma)   │     │ (Anomaly AI) │
             └─────────────┘     └─────────────┘
🛡️ Anti-Fraud System

TrustPoll uses a four-layer approach to keep voting results trustworthy:

Device Fingerprinting — FingerprintJS identifies unique devices to prevent duplicate votes from the same source.
Rate Limiting — Throttles suspiciously fast or repeated requests.
Pattern Analysis — Flags anomalous voting behavior (e.g., bulk votes in short windows).
Cross-Node Verification — Cluster nodes cross-check vote records to catch inconsistencies before they're finalized.
🚀 Getting Started
Prerequisites
Node.js (v18+)
PostgreSQL database
npm or yarn
Installation
bash
# Clone the repository
git clone https://github.com/<your-username>/trustpoll.git
cd trustpoll

# Install backend dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Fill in your DATABASE_URL and other config values

# Run Prisma migrations
npx prisma migrate dev

# Start the backend
npm run dev
bash
# In a separate terminal, install and run the frontend
cd frontend
npm install
npm run dev
Running the Cluster Locally

To simulate the full cluster setup on multiple machines, run an instance of the backend on each laptop with a unique NODE_ID set in .env, and point them at the same PostgreSQL instance. See docs/implementation-plan.md for the full setup used at Network Expo.

📂 Project Documentation

This project was built with full formal documentation, including:

Product Requirements Document (PRD)
Tech Stack Overview
Frontend Guidelines
Backend Schema
Implementation Plan
API Contract

(See the /docs folder for details.)

📊 Admin Panel

The admin dashboard (/admin) provides:

One-click poll/project reset
Full CRUD for polls and options
Live results view with real-time updates
Built-in chatbot for quick navigation help
🗺️ Roadmap
 WebSocket-based live result streaming
 Multi-region cluster support
 Configurable anomaly detection thresholds
 Public API for third-party poll embedding
📄 License

This project is licensed under the MIT License — see the LICENSE file for details.

🙋 About

Built by Yashwanth as a Network Expo project demonstrating distributed systems concepts in a practical, live-voting context.
