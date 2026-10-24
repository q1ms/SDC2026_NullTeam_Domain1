# jAIX (Job Artificial Intelligence Expert)

**Team:** NullTeam  
**Domain:** Domain 1 - AIVERSECITY (Future-Ready Workforce)  
**University:** Universiti Malaya  
**Hackathon:** SDC Hackathon 2026  

## 🔗 Important Links
*   **Live Demo:** [https://jAIX-Job-Artificial-Intelligence-Expert.replit.app](https://jAIX-Job-Artificial-Intelligence-Expert.replit.app)
*   **Pitch Video:** [https://youtu.be/5P5UhFmjK4Q](https://youtu.be/5P5UhFmjK4Q)
*   **Slide Deck (Canva):** [https://canva.link/7tjxdi7mad30c6j](https://canva.link/7tjxdi7mad30c6j)
*   **Replit Workspace:** [https://replit.com/@irzamredza00/Job-Artificial-Intelligence-ExpertjAIX](https://replit.com/@irzamredza00/Job-Artificial-Intelligence-ExpertjAIX)
*   **RunPod Endpoint:** `https://api.runpod.ai/v2/9jhb8rl8fo1rhw`

## 🚀 About jAIX
AI is rapidly reshaping the labor market, displacing routine roles while creating demand for new AI-adjacent occupations. Roughly **56% of roles face meaningful disruption**, while only **26% of workers** are on clearly growing pathways. 

**jAIX** is a dynamic web platform that guides users from their current skills to AI-era readiness. It helps working adults, fresh graduates, and HR teams map their current skills to resilient, growing roles and provides actionable, SDG-aligned reskilling pathways.

### The 4-Step Journey:
1.  **Intake:** Users input their current skills or upload a CV (extracted via AI).
2.  **Trend Radar:** Surfaces role growth outlooks and disruption risks using live data feeds.
3.  **Role Matching:** Applies explainable, rule-based skill-fit scoring to rank compatible roles and identify skill gaps.
4.  **Reskilling Pathways:** Generates ordered learning roadmaps utilizing free online courses.

*Users can stress-test recommendations using the **Moderate vs. Fast AI Disruption** toggle, ensuring transparency in an uncertain job market.*

## 🛠️ Tech Stack & Architecture
*   **Frontend:** React, Vite, Tailwind CSS, Radix UI, Framer Motion
*   **Backend:** Node.js, Express 5, Pino (Logging)
*   **Database:** File-backed SQLite (hosted on Replit), Browser `localStorage` for journey snapshots
*   **AI & Cloud Infrastructure:** 
    *   **RunPod:** Serverless GPU endpoint running `Qwen2.5-7B-Instruct` to extract CV text into structured JSON.
    *   **Replit:** Core cloud IDE, collaborative workspace, and live deployment hosting.
*   **External APIs:** Google News RSS (live trend data), Unsplash CDN.
*   **Validation:** Zod, Orval, OpenAPI.

## 💻 How to Run Locally
If you wish to run the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/q1ms/SDC2026_NullTeam_Domain1.git
