# Cosmic Bingo 🌌

Welcome to **Cosmic Bingo**, a real-time multiplayer strategy game set in the depths of space. Challenge your friends to an interstellar battle of wits and luck, featuring a futuristic holographic interface and immersive cosmic effects.

## 🚀 Features

-   **Multiplayer Gameplay**: Play against friends in real-time using WebSocket technology.
-   **Cosmic Theme**: Immerse yourself in a sci-fi atmosphere with neon glows, holographic panels, and celestial animations.
-   **Interactive Boards**: Fill your board strategically and race to complete lines.
-   **Live Updates**: Real-time turn indicators, score tracking, and game status updates.
-   **Responsive Design**: Play seamlessly on desktop or mobile devices.

## 🛠️ Technology Stack

This project is built using a modern full-stack approach:

### Client (Frontend)
-   **React**: For building the interactive user interface.
-   **Vite**: For fast development and optimized production builds.
-   **Socket.io-client**: For real-time communication with the server.
-   **React Router**: For seamless navigation between pages.
-   **Canvas Confetti**: For celebratory victory effects.
-   **Three.js / React Three Fiber**: For advanced 3D visual effects (optional/future integration).
-   **CSS3**: Custom animations and variables for the cosmic theme.

### Server (Backend)
-   **Node.js**: The runtime environment for the backend.
-   **Express**: For handling API requests and serving the application.
-   **Socket.io**: To enable bi-directional, real-time communication.
-   **CORS**: To handle cross-origin requests securely.

---

## 🏁 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites
-   [Node.js](https://nodejs.org/) (v16 or higher)
-   npm (comes with Node.js)

### Installation

1.  **Clone the repository** (if applicable) or navigate to the project root.

2.  **Server Setup**:
    Open a terminal and navigate to the `server` directory:
    ```bash
    cd server
    npm install
    ```

3.  **Client Setup**:
    Open a *new* terminal window and navigate to the `client` directory:
    ```bash
    cd client
    npm install
    ```

---

## 🏃‍♂️ Running the Application

To play the game, you need to run both the server and the client simultaneously.

### 1. Start the Server
In your **server** terminal:
```bash
# Standard start
node index.js

# Or with nodemon (if installed globally for auto-restart)
nodemon index.js
```
The server will start on port `3000`.

### 2. Start the Client
In your **client** terminal:
```bash
npm run dev
```
The client will typically start on `http://localhost:5173` (check the terminal output for the exact URL).

### 3. Play!
Open your browser and navigate to the client URL (e.g., `http://localhost:5173`).
-   **Player 1**: Create a new room (optionally set a password).
-   **Player 2**: Join the room using the Room ID (and password if set).

---

## 🎮 How to Play

1.  **Create/Join**: Start a new game room or join an existing one.
2.  **Fill Phase**: Both players have 60 seconds to fill their 5x5 grid with numbers 1-25. Strategize your placement!
    -   Click cells to place numbers manually.
    -   Use `Auto-Fill` to instantly complete your board.
3.  **Play Phase**: Take turns selecting a number on your board.
    -   The selected number is crossed off on *both* players' boards.
    -   Try to complete 5 rows, columns, or diagonals.
4.  **Win**: The first player to complete 5 lines (BINGO) wins the game!

---

## 🤝 Contributing

Feel free to fork this project and submit pull requests. Suggestions and improvements are welcome!

## 📄 License

This project is open-source and available under the standard MIT License.
