# PHANTOM — Frontend Architecture & Implementation Guide
> **An in-depth narrative guide to how the PHANTOM frontend works, designed to help you explain the system architecture, design decisions, and data flow to the judges.**

---

## 1. The Technology Choices and Why We Made Them

When designing the PHANTOM frontend, the primary goal was to create a highly responsive, real-time Security Operations Center (SOC) dashboard capable of visualizing complex data without lagging. 

*   **React 18 & TanStack Router:** We chose React as our core framework, paired with TanStack Start and Router. We intentionally avoided heavier frameworks like Next.js because we wanted a lightweight, file-based routing system without the overhead of Server Components, ensuring a pure, highly interactive client-side application. 
*   **TypeScript:** The entire application is written in strict TypeScript to guarantee type safety across all our API contracts, meaning we know exactly what data shape to expect from the AI engines.
*   **TanStack Query:** For state management and data fetching, we rely entirely on TanStack Query (React Query). Instead of using Redux or Zustand, React Query perfectly handles the asynchronous nature of our dashboard. It caches the data, deduplicates simultaneous API requests, and handles background polling to keep the threat feeds fresh without freezing the UI.
*   **Tailwind CSS v4:** To achieve the premium, modern aesthetic, we utilized Tailwind CSS combined with custom design tokens. We built a custom theme centered around a dark, cyberpunk-inspired palette, using cyan and emerald for active/safe states, and varying shades of yellow, orange, and red to denote escalating risk levels.
*   **Recharts & Custom SVGs:** Standard timeline trends and risk distributions are handled by Recharts, which provides excellent React-native SVG charting. However, for our complex, multi-layered employee network and collusion graphs, we chose to write pure, custom SVG rendering engines. Relying on heavy graph libraries like D3 or Cytoscape would have bloated our bundle size. Instead, our custom SVG components compute deterministic cluster layouts and handle interactivity natively, resulting in a buttery-smooth experience.
*   **Framer Motion:** All component transitions and micro-interactions are powered by Framer Motion, giving the app its fluid, high-end feel.

---

## 2. How Data Flows Through the System

When a judge asks how the data gets from the backend to the screen, here is the exact flow:

1.  **Component Mount:** The journey begins when a user navigates to a route. As the page components mount, they trigger our custom React hooks (e.g., `useLeaderboard()`).
2.  **Cache Check:** React Query checks its local cache. If the data is fresh (within 30-60 seconds), it renders instantly without a network call.
3.  **API Request:** If stale, React Query fires a native `fetch` request to our local `/api/*` endpoints.
4.  **Vite Proxy:** Our Vite development server acts as a proxy, intercepting this request and seamlessly forwarding it to our FastAPI backend running on port 8000, avoiding all CORS issues.
5.  **Backend Processing:** The Python backend retrieves pre-computed risk predictions, joins them with employee metadata (branch, role), and calculates the final composite DITS (Dynamic Insider Threat Score).
6.  **Render & Animate:** The JSON payload is returned, React Query updates its cache, React re-renders the DOM, and Framer Motion plays the entrance animations. The entire round trip happens in less than 100 milliseconds.

---

## 3. The Core User Journey: Page by Page and Card by Card

The PHANTOM dashboard is divided into five distinct routes, each serving a specific role in the analyst's workflow.

### The SOC Overview Dashboard (`/`)
This is the command center providing a high-level summary of the entire organization's security posture.

*   **Top Metric Cards:**
    *   **Monitored Employees:** The total active headcount (50 employees).
    *   **Critical / High Risk:** Count of users requiring immediate intervention. Pulses red if > 0.
    *   **Medium Risk:** Count of users currently on the watchlist.
    *   **Log Events Analysed:** Total number of clickstream events processed by the engines (e.g., 977,705).
    *   **SOC Threat Level:** A calculated overall system status (e.g., CRITICAL, ELEVATED, NOMINAL).
*   **Active Threat Feed Table:** A real-time list of the highest-risk individuals.
    *   Displays: Employee ID, Name, Role, Branch, composite DITS Score, and a color-coded Risk Status badge.
    *   Interactivity: Clicking any row navigates directly to that employee's full 360° profile.
*   **Detection Engine Matrix:** A system status card.
    *   Displays the names and underlying methods of all 4 AI engines (e.g., Engine 1: Temporal Chain Analyser via LSTM) and their current operational status (ONLINE).
*   **Risk Distribution Card:** A visual breakdown of the current risk landscape.
    *   Displays: An animated stacked progress bar showing the percentage of employees in each risk tier (Critical, High, Medium, Low, Normal), accompanied by raw counts.

### The Risk Leaderboard (`/leaderboard`)
When an analyst needs to see the full roster, they navigate to the Leaderboard. 

*   **Filter & Search Controls:** 
    *   Data: Live text search by Name, ID, or Role. Dropdown filters for Risk Level (All, Critical, High, etc.) and Branch location.
*   **Main Ranked Table:** All 50 employees ranked by DITS score.
    *   Displays: Rank, Employee details, DITS score, and the Risk Badge.
    *   **Engine Mini Bars:** Four tiny color-coded bar charts (Cyan, Orange, Purple, Green) providing a quick visual breakdown of the employee's sub-scores for Engines 1, 2, 3, and 4.
*   **Risk Distribution Chart:** A Recharts bar chart summarizing the current filtered view.

### The Graph Visualizer (`/investigation`)
An interactive, three-level drill-down interface designed to trace threats from high-level trends down to specific keystrokes. 

*   **Level 1: Timeline Strip:**
    *   Data: A horizontal scrollable list of the last 15 days.
    *   Displays: Date, total access count, number of active employees, and total threat count for that specific day.
*   **Level 2: Employee Co-Access Network (SVG):**
    *   Data: A fullscreen, force-directed network graph of all employees active on the selected day.
    *   Displays: Nodes represent employees (clustered by branch). Edges represent co-accessed systems. Bright red lines highlight suspected collusion pairs (identified by Engine 3).
*   **Level 3: Action Chain View:**
    *   Data: Chronological action log for a single employee on a specific day.
    *   Displays: Exact timestamped modules accessed, the sequence flow, and the Engine 1 chain risk score assigned to that specific session.

### The 360° Employee Profile (`/employee/:id`)
Aggregates all known data for a specific individual into a single pane of glass.

*   **Trust Score Card:**
    *   Displays: The main DITS score (0-100) via an animated TrustDial gauge, the Risk Badge, and the top plain-text reason they were flagged.
*   **Sub-Score Cards (4x):**
    *   Displays: Individual scores (0-100) for Engine 1 (Chain), Engine 2 (Avoidance), Engine 3 (Collusion), and Engine 4 (Language).
*   **90-Day Timeline Chart:**
    *   Data: Daily access trends over 90 days via Recharts.
    *   Displays: Line series for Primary Activity, Audit accesses, Compliance accesses, and Override occurrences.
*   **Engine 2 XAI Card:**
    *   Displays: The exact human-readable reasons Engine 2 (Isolation Forest) flagged the user (e.g., "Audit Reports not accessed for 31 days").
*   **Engine 3 Collusion Graph:**
    *   Data: A bipartite SVG graph showing the employee's network.
    *   Displays: The focal employee, the specific banking modules they co-accessed, and the peer employees they accessed them with.
*   **Employee Profile Metadata:**
    *   Displays: HR and behavioral context (Years of experience, stated risk profile, work style, typical arrival/leave times, typing speed).
*   **AI Investigation Panel:**
    *   Data: A Gemini-generated executive summary.
    *   Displays: A readable markdown report synthesizing all numerical telemetry into a forensic narrative, complete with a confidence score and key evidence bullet points.

### The Live Risk Simulator (`/simulator`)
Proves to the judges that the AI is not hard-coded.

*   **Input Controls:**
    *   Data: Manual entry fields for Employee ID, a simulated list of module actions, a custom override justification note, and a simulated access void score.
*   **Live Evaluation Results:**
    *   Displays: When submitted, the backend runs the inputs through the engines in real-time, returning the newly calculated DITS score, the individual engine sub-scores, and a live NLP category breakdown for the text note.

---

## 4. Key Technical Decisions and Trade-offs

During development, we had to make several architectural choices to balance performance with visual impact.

*   **Why custom SVGs instead of D3.js?** We realized that for a dataset of 50 employees, a heavy physics engine was overkill. By writing pure React SVG components, we maintained total control over the styling, perfectly matching our dark cyberpunk theme, while keeping the bundle size incredibly small. We used deterministic mathematical layouts to cluster the nodes by department, ensuring a clean, readable graph with zero overlapping nodes.
*   **How do we handle performance with nearly a million log events?** If the frontend tried to process 977,000 raw clickstream events, the browser would crash. The heavy lifting is strictly isolated to the backend. The Python engine pre-computes the timeline aggregations and risk scores, summarizing the data into highly optimized JSON payloads. When the frontend requests the leaderboard, it receives a lightweight array that renders instantly.
*   **How do we manage all these API calls?** Because a single page might contain multiple components requesting the same data, we rely on TanStack Query to deduplicate these requests. It batches them together so only one actual network call is made. We set aggressive caching rules (30-60 seconds), meaning if a user navigates away and comes back, the page renders instantly from memory.

---

## 5. Handling Common Judge Questions

When presenting, you can expect judges to probe the reality of the implementation. Here is how to address their concerns:

**"Is this just a mock UI, or is it actually processing data?"**
> "While the historical dataset covers a 90-day period from the past, the frontend is actively pulling live, calculated results from the Python backend. The React app has no hard-coded risk scores. If we go to the Simulator page and type a custom justification note, you can watch Engine 4 (the NLP model) score the text live."

**"What exactly is the DITS score?"**
> "DITS stands for Dynamic Insider Threat Score. It is a composite metric. It weights Engine 1 (Sequence Risk) and Engine 2 (Access Avoidance) at 30% each, as these are the primary behavioral indicators. Engine 3 (Collusion) and Engine 4 (Language) are weighted at 20% each, acting as secondary corroborating signals. The frontend aggregates these into the final 0-100 score shown in the UI."

**"How does the Gemini AI integration work?"**
> "We are not using Gemini to *detect* the threat; our four proprietary Python engines do the mathematical anomaly detection. We use Gemini purely as a summarization tool. The frontend takes the output of our four engines—the numerical scores and flag reasons—and sends them to Gemini to translate the math into an easy-to-read executive report for a human security analyst."

**"How does the Collusion Graph know who is working together?"**
> "Engine 3 builds a mathematical 'bipartite graph'—it maps employees to the specific computer modules they use. If two employees, who normally don't work together, suddenly start accessing the exact same sensitive modules within minutes of each other, the engine flags them. The frontend visualizes this math by drawing red lines between those specific employees on the Network Graph."
