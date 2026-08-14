import os
import uvicorn
from fastapi import FastAPI
import socketio
from google import genai
from google.genai import types

# --- 1. SETUP ---
app = FastAPI(title="Real-Time Translation Chat API")

# Setup Socket.IO for real-time communication.
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# --- YOUR API KEY IS SET DIRECTLY HERE ---
API_KEY = "AQ.Ab8RN6IH5_5yh76iUlWLuzGw3lA-ZTJ46frIdC79TowpdEL22g" # Ensure this is your real key!

# Initialize the new Google Gen AI Client
try:
    # This creates the core client
    sync_client = genai.Client(api_key=API_KEY)
    
    # This exposes the asynchronous version of the client so our chat doesn't freeze
    ai_client = sync_client.aio 
    print("✅ Gemini Client initialized successfully.")
except Exception as e:
    print(f"❌ Gemini setup failed: {e}")

# Model optimized for fast, real-time responses
MODEL_NAME = "gemini-flash-lite-latest"

# --- 2. THE TRANSLATION LOGIC ---
async def translate_text(text: str, target_language: str) -> str:
    """Sends text to Gemini to translate into the target language asynchronously."""
    
    system_instruction = (
        f"You are a professional real-time translator. "
        f"Translate the given text into {target_language}. "
        f"Maintain the exact tone and emotion of the original text. "
        f"Return ONLY the translated text, nothing else."
    )
    
    try:
        # Note the use of `await ai_client.models.generate_content`
        response = await ai_client.models.generate_content(
            model=MODEL_NAME,
            contents=text,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"Translation Error: {e}")
        return "⚠️ Translation failed."

# --- 3. THE REAL-TIME WEBSOCKET HUB ---
@sio.on("connect")
async def connect(sid, environ):
    print(f"🔵 Client connected: {sid}")

@sio.on("chat_message")
async def handle_message(sid, data):
    """
    Listens for messages from the frontend.
    Expected data: { "text": "Hallo!", "sender_role": "customer" } 
    """
    original_text = data.get('text', '')
    sender_role = data.get('sender_role', '')
    
    if sender_role == 'customer':
        target_language = 'English'
    elif sender_role == 'employee':
        target_language = 'German'
    else:
        return
        
    print(f"Translating '{original_text}' to {target_language}...")
    
    # Call the translation function we defined above
    translated_text = await translate_text(original_text, target_language)
    
    payload = {
        "original_text": original_text,
        "translated_text": translated_text,
        "sender_role": sender_role,
    }
    
    await sio.emit("receive_message", payload)

# --- 4. START THE SERVER ---
if __name__ == "__main__":
    print("🚀 Starting Server on http://localhost:8000")
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)