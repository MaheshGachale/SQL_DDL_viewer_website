# SQL DDL Viewer - Web Version

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**SQL DDL Viewer** is a powerful, interactive tool often available as a VS Code extension, now adapted for the web! Visualize your SQL database schemas instantly by simply pasting your DDL statements. Use it to understand table relationships, trace data lineage, and debug complex views and CTEs.

## ✨ Features

-   **Instant Visualization**: Paste `CREATE TABLE`, `VIEW`, `MATERIALIZED VIEW` statements and see the schema diagram immediately.
-   **Interactive Diagrams**: Zoom, pan, and explore your database structure.
-   **Relationship Mapping**: Clearly see Foreign Key connections and dependencies.
-   **CTE & View Lineage**: Visualize complex data pipelines with color-coded paths for CTEs and Views.
-   **Secure & Private**: Processing happens locally in your browser (client-side), ensuring your schema data stays private.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v14 or higher)
-   npm (v6 or higher)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/MaheshGachale/SQL_DDL_viewer_website.git
    cd SQL_DDL_viewer_website
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    npm run install-all # if using a specific script, otherwise just npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

## 🛠️ Built With

-   **React** - UI Library
-   **TypeScript** - Type safety
-   **Vite** - Build tool and dev server
-   **TailwindCSS** (or custom CSS as used) - Styling
-   **React Flow** (or similar library if used for diagrams) - Diagramming

## 📄 License

This project is licensed under the MIT License.

---

**Made with ❤️ by [Mahesh Gachale](https://github.com/MaheshGachale)**
