from google import genai

# Your API Key
API_KEY = "AQ.Ab8RN6IH5_5yh76iUlWLuzGw3lA-ZTJ46frIdC79TowpdEL22g"

try:
    client = genai.Client(api_key=API_KEY)
    print("🔍 Asking Google for your available models...\n")
    
    # This asks Google for every model your key is allowed to use
    for model in client.models.list():
        print(f"✅ Available Model: {model.name}")
        
except Exception as e:
    print(f"Error: {e}")