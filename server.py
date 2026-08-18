import os
import time
import sqlite3
from flask import Flask, jsonify, request
from flask_socketio import SocketIO, join_room, emit
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Load hidden environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Fetch API key securely from .env
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("⚠️ No API Key found! Please check your .env file.")

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-flash-lite-latest')

def init_db():
    conn = sqlite3.connect('chat_history.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT NOT NULL,
            original_text TEXT NOT NULL,
            translated_text TEXT NOT NULL,
            sender_role TEXT NOT NULL,
            target_language TEXT NOT NULL,
            timestamp REAL NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            room TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            timestamp REAL NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def save_session(room, title):
    try:
        conn = sqlite3.connect('chat_history.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR IGNORE INTO sessions (room, title, timestamp)
            VALUES (?, ?, ?)
        ''', (room, title, time.time()))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ DB Session Error: {e}")

def save_message_to_db(room, original_text, translated_text, sender_role, target_language, timestamp):
    try:
        conn = sqlite3.connect('chat_history.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO messages (room, original_text, translated_text, sender_role, target_language, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (room, original_text, translated_text, sender_role, target_language, timestamp))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ DB Message Error: {e}")

def get_messages_from_db(room):
    try:
        conn = sqlite3.connect('chat_history.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT original_text, translated_text, sender_role, target_language, timestamp 
            FROM messages WHERE room = ? ORDER BY timestamp ASC
        ''', (room,))
        rows = cursor.fetchall()
        conn.close()
        return [{"original_text": r[0], "translated_text": r[1], "sender_role": r[2], "target_language": r[3], "timestamp": r[4]} for r in rows]
    except Exception as e:
        print(f"⚠️ DB Read Error: {e}")
        return []

@app.route('/api/chats', methods=['GET'])
def get_all_chats():
    try:
        conn = sqlite3.connect('chat_history.db')
        cursor = conn.cursor()
        cursor.execute('SELECT room, title, timestamp FROM sessions ORDER BY timestamp DESC')
        rows = cursor.fetchall()
        conn.close()
        return jsonify([{"room": r[0], "title": r[1], "timestamp": r[2]} for r in rows])
    except Exception:
        return jsonify([])

def translate_text(text: str, target_language: str) -> str:
    try:
        prompt = f"Translate the following text into {target_language}. Maintain the exact tone and emotion. Return ONLY the translated text, nothing else.\n\nText: {text}"
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"❌ Translation Error: {e}")
        return f"⚠️ Translation API failed: {str(e)}"

@app.route('/')
def home():
    return "Multi-Language Persistent API is running!"

@socketio.on('join_room')
def handle_join(data):
    room = data.get('room')
    join_room(room)
    history = get_messages_from_db(room)
    emit('load_history', history)

@socketio.on('chat_message')
def handle_message(data):
    try:
        original_text = data.get('text', '')
        sender_role = data.get('sender_role', '')
        target_language = data.get('target_language', 'English')
        room = data.get('room')
        
        print(f"\n📥 Received: '{original_text}' | To: {target_language} | Room: '{room}'")
        
        save_session(room, original_text[:30] + "...")
        translated_text = translate_text(original_text, target_language)
        timestamp = time.time()
        
        payload = {
            "original_text": original_text,
            "translated_text": translated_text,
            "sender_role": sender_role,
            "target_language": target_language,
            "timestamp": timestamp
        }
        
        save_message_to_db(room, original_text, translated_text, sender_role, target_language, timestamp)
        emit("receive_message", payload, to=room)
        print(f"📤 Sent: '{translated_text}'\n")
        
    except Exception as e:
        print(f"❌ Critical Error in handle_message: {e}")
        emit("receive_message", {
            "original_text": data.get('text', ''),
            "translated_text": "⚠️ System Error: Please check backend terminal.",
            "sender_role": data.get('sender_role', ''),
            "target_language": data.get('target_language', 'English'),
            "timestamp": time.time()
        }, to=data.get('room'))

if __name__ == "__main__":
    print("🚀 Starting Translation Server on port 5000...")
    socketio.run(app, host='127.0.0.1', port=5000, debug=True)