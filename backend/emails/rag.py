import chromadb
import google.generativeai as genai
from django.conf import settings

# Initialize ChromaDB in the backend root directory
client = chromadb.PersistentClient(path="./chroma_db")

def get_or_create_collection(user_id):
    # Isolate data per user
    return client.get_or_create_collection(name=f"user_{user_id}_emails")

def add_email_to_rag(email_obj):
    collection = get_or_create_collection(email_obj.user.id)
    
    # Create text to embed
    content = f"Subject: {email_obj.subject}\nSender: {email_obj.sender}\nDate: {email_obj.received_at}\nBody: {email_obj.snippet}"
    
    try:
        # Generate embedding using Gemini
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=content,
            task_type="retrieval_document",
        )
        embedding = result['embedding']
        
        collection.add(
            embeddings=[embedding],
            documents=[content],
            metadatas=[{"message_id": email_obj.message_id, "category": email_obj.category}],
            ids=[email_obj.message_id]
        )
    except Exception as e:
        print(f"RAG Add Error: {e}")

def chat_with_inbox(user_id, query):
    collection = get_or_create_collection(user_id)
    
    try:
        # Check if collection is empty
        if collection.count() == 0:
            return "Your inbox is currently empty or no important emails have been processed yet."

        # Embed the query
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=query,
            task_type="retrieval_query",
        )
        query_embedding = result['embedding']
        
        # Search Top 5 related emails
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(5, collection.count())
        )
        
        retrieved_docs = results['documents'][0] if results['documents'] else []
        
        if not retrieved_docs:
            return "I couldn't find any relevant emails."
            
        context = "\n\n---\n\n".join(retrieved_docs)
        
        prompt = f"""
        You are an intelligent AI Email Assistant. 
        Answer the user's question accurately based ONLY on the following emails retrieved from their inbox.
        If the answer is not in the emails, politely state that you couldn't find it.
        Keep the response concise and professional.
        
        User Question: {query}
        
        Retrieved Emails Context:
        {context}
        """
        
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text
        
    except Exception as e:
        print(f"RAG Chat Error: {e}")
        return "Sorry, I encountered a temporary error while searching your inbox."
