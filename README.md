# STIL Analyzer Pro - Semiconductor Scan Diagnostic Platform

A production-ready full-stack application for semiconductor scan architecture reconstruction, fault localization, and silicon heatmap visualization.

## 🚀 Features

- **STIL Parsing**: Dynamic reconstruction of scan chains and EDT logic.
- **Fault Localization**: Real-time identification of Stuck-at faults and Chain Breaks.
- **Heatmap Engine**: Weighted diagnostic intensity mapping (Root vs. Propagation).
- **Interactive Topology**: SVG-based architecture diagram with failure hotspots.
- **AI Insights**: Automated engineering recommendations based on diagnostic data.

---

## 🛠 Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **VS Code**: Recommended editor

---

## 📦 Installation

1. **Clone or Download** the project to your local machine.
2. Open the project folder in **VS Code**.
3. Open the terminal in VS Code (`Ctrl+` ` ` or `Cmd+` ` `).
4. Install the dependencies:
   ```bash
   npm install
   ```

---

## ⚙️ Configuration

1. Create a `.env` file in the root directory.
2. Add your Gemini API key (required for the AI Insight Panel):
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

---

## 🏃‍♂️ Running the App

The application runs as a **Full-Stack Express + Vite** app.

### Development Mode
To start the server and the frontend together:
```bash
npm run dev
```
- The app will be available at: **http://localhost:3000**
- The backend API runs on the same port.

### Production Build
To build the app for production:
```bash
npm run build
npm start
```

---

## 📂 Project Structure

- `src/` - Frontend (React + Tailwind + Framer Motion)
  - `components/` - UI components (Topology, Visualizer, Legend)
  - `store/` - Zustand state management
- `server/` - Backend Logic
  - `parser.ts` - STIL and Fail Log parsing engine
  - `heatmapEngine.ts` - Weighted heat calculation logic
- `server.ts` - Express server entry point

---

## 🧪 Usage

1. **Upload STIL**: Drag and drop your `.stil` file to reconstruct the architecture.
2. **Upload Fail Log**: Provide an ATE `.log` or `.txt` file to trigger fault localization.
3. **Analyze**: Use the **Architecture Topology** for a high-level view and the **FF Chain Schematic** for bit-level debugging.
