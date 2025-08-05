#!/usr/bin/env python3
"""
Quick test script to verify OpenAI API connection
"""
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_openai_connection():
    api_key = os.getenv("OPENAI_API_KEY")
    
    print("🔍 Testing OpenAI API Connection...")
    print(f"API Key: {'*' * 20}{api_key[-4:] if api_key and len(api_key) > 4 else 'NOT SET'}")
    
    if not api_key or api_key == "sk-your-openai-api-key-here":
        print("❌ Error: OpenAI API key not configured!")
        print("Please set OPENAI_API_KEY in your .env file")
        return False
    
    try:
        client = OpenAI(api_key=api_key)
        print("✅ OpenAI client initialized")
        
        # Try a simple completion
        model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        print(f"📝 Testing with model: {model}")
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'Hello, Lemur!' if you can hear me."}
            ],
            max_tokens=50
        )
        
        print(f"✅ Response: {response.choices[0].message.content}")
        print("\n🎉 OpenAI API connection successful!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        
        if "api_key" in str(e).lower():
            print("\n💡 Hint: Your API key might be invalid. Please check it.")
        elif "model" in str(e).lower():
            print("\n💡 Hint: You might not have access to this model. Try setting OPENAI_MODEL=gpt-3.5-turbo in .env")
        
        return False

if __name__ == "__main__":
    test_openai_connection()