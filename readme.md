# 🌐 BabelStream AI

![BabelStream AI](https://img.shields.io/badge/Status-Active-success.svg) ![License](https://img.shields.io/badge/License-MIT-blue.svg) ![Gemini](https://img.shields.io/badge/AI-Google_Gemini-violet.svg)

**BabelStream AI** is an enterprise-grade, cross-lingual communication suite designed to break down language barriers in real-time. Built with a robust Python/Flask backend and a modern React frontend, it leverages the ultra-low latency **Google Gemini Flash-Lite** AI model to provide seamless, live translations for customer support and global team chats.

---

## ✨ Key Features

* **⚡ Real-Time AI Translation:** Instantly translates messages between users speaking different languages using the Gemini AI API.
* **🔌 WebSocket Integration:** Utilizes Socket.IO for persistent, bi-directional, and ultra-fast real-time communication.
* **💾 Persistent Chat History:** Automatically saves chat sessions and messages locally using SQLite, allowing users to resume past conversations.
* **🗣️ Auto-Speak (TTS):** Integrated Text-to-Speech functionality to read translated incoming messages aloud.
* **🎭 Role-Based UI:** Distinct visual indicators for 'Customer' and 'Support Agent' roles.
* **📱 Responsive & Animated UI:** A beautiful, dark-mode interfaced built with Tailwind CSS, Lucide React icons, and Framer Motion for fluid animations.

---

## 🛠️ Technology Stack

**Frontend:**
* React.js (Vite)
* Tailwind CSS
* Framer Motion (Animations)
* Socket.IO Client

**Backend:**
* Python
* Flask & Flask-SocketIO (WebSocket Server)
* SQLite (Database)
* Google Generative AI SDK (Gemini)

---

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.8 or higher)
* A **Google Gemini API Key** (Get one for free at [Google AI Studio](https://aistudio.google.com/))

### 1. Clone the Repository
```bash
git clone [https://github.com/rohitsinghrathore23/Babel-Stream-AI.git](https://github.com/rohitsinghrathore23/Babel-Stream-AI.git)
cd Babel-Stream-AI

2. Backend Setup
Install the required Python dependencies:
pip install flask flask-socketio flask-cors google-generativeai python-dotenv
Create a .env file in the root directory based on the provided example:
cp .env.example .env
Open the .env file and insert your actual Google Gemini API Key:
GEMINI_API_KEY=your_actual_api_key_here

3.Frontend Setup
Open a new terminal, navigate to the frontend directory, and install the Node modules:
cd frontend
npm install

💻 Running the Application
You will need to run the backend and frontend simultaneously in two separate terminals.

Terminal 1 (Backend):
Ensure you are in the root directory of the project.
python server.py
The server will start running on http://127.0.0.1:5000

Terminal 2 (Frontend):
Navigate to the frontend folder.
cd frontend
npm run dev
Vite will provide a local URL (usually http://localhost:5173/). Open this link in your browser to use the app.

🤝 Usage
Enter a unique Room Identifier (e.g., global-room-1).
Select your native language and the language you want to translate to.
Select your operational role (Customer or Support Agent).
Click Initialize Secure Connection.
Start chatting! Open the app in a second browser window, join the same room with different languages, and watch the real-time AI translation in action.
Developed by Rohit Singh Rathore