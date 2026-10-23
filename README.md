# Future-Ready Workforce AI

Welcome to the official repository for **Future-Ready Workforce AI**, submitted for the **SDC Hackathon**.

## 🏆 Team NullTeam
We are **NullTeam**, a group of passionate developers, designers, and problem-solvers dedicated to building innovative AI solutions. 

## 🌍 Domain 1: AIVERSECITY
This project was developed under **Domain 1 (AIVERSECITY)**. Our platform leverages Artificial Intelligence to prepare and equip the workforce for the future. By analyzing career paths and job trends, we provide actionable insights to guide continuous learning and adaptation in a rapidly evolving, AI-driven job market.

## 💻 Tech Stack
Our project is structured as a modern full-stack monorepo:
- **Frontend**: React, Vite, Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Node.js, Express, Pino (Logging)
- **Database & ORM**: SQLite, Drizzle ORM
- **API & Validation**: Zod, Orval, OpenAPI
- **Package Manager**: pnpm workspaces

## 🚀 How to Run the App Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v24 or v20+ recommended)
- [pnpm](https://pnpm.io/) (v12+ recommended)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/q1ms/SDC2026_NullTeam_Domain1.git
   cd SDC2026_NullTeam_Domain1
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   If you want to use the AI capabilities, you will need to provide an OpenRouter API key. Set it in your local environment:
   ```bash
   # Windows (CMD)
   set OPENROUTER_API_KEY=your_api_key_here
   
   # Mac/Linux/GitBash
   export OPENROUTER_API_KEY="your_api_key_here"
   ```

4. **Start the development servers:**
   ```bash
   pnpm run dev
   ```
   Because this is a monorepo, this single command will build the shared libraries and concurrently start all development servers:
   - **Main Frontend (Workforce AI)**: `http://localhost:5173`
   - **Backend API Server**: `http://localhost:5000`
   - **UI Mockup Sandbox**: `http://localhost:5174`

## 🌀 How We Used Replit
Replit was a core part of our development and deployment workflow for this hackathon:
- **Cloud Native Development**: We utilized Replit's cloud-based IDE for seamless collaboration across the team without worrying about local environment discrepancies.
- **Automated Workspaces**: The `.replit` configuration in our repository defines our environment (`nodejs-24`), build steps, and parallel workflow execution, ensuring that our complex monorepo spins up instantly.
- **Integrated Tooling**: Replit allowed us to iterate quickly on the frontend and backend simultaneously, testing our API routes and React components in a unified sandbox environment.
- **Deployment**: We leverage Replit's hosting platform to reliably serve our application and demonstrate it for the hackathon judges.

---
*Built with ❤️ by NullTeam for the SDC Hackathon.*