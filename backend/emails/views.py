import json
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import AnalyzedEmail
from .serializers import AnalyzedEmailSerializer
from datetime import datetime
from django.utils.timezone import make_aware

import google.generativeai as genai
from django.conf import settings

# Configure Gemini AI
genai.configure(api_key=settings.GEMINI_API_KEY)

def analyze_email_content(subject, snippet):
    content = f"Subject: {subject}\nBody: {snippet}"
    prompt = f"""
    Analyze the following email. Is it an important job-related opportunity (such as an interview invitation, job offer, or application update)?
    Respond strictly in JSON format without any markdown blocks.
    Format: {{"is_important": true/false, "category": "Job-Related" or "Other"}}
    
    Email:
    {content}
    """
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        data = json.loads(text.strip())
        return data.get("category", "Other"), data.get("is_important", False)
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Fallback
        job_keywords = ['internship', 'hiring', 'offer', 'job', 'interview', 'application', 'career']
        content_lower = content.lower()
        for kw in job_keywords:
            if kw in content_lower:
                return 'Job-Related', True
        return 'Other', False

from .rag import add_email_to_rag, chat_with_inbox

class EmailListView(generics.ListAPIView):
    serializer_class = AnalyzedEmailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyzedEmail.objects.filter(user=self.request.user)

class ProcessEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        emails = request.data.get('emails', [])
        processed = []
        
        for email_data in emails:
            # Check if email already exists
            if AnalyzedEmail.objects.filter(message_id=email_data.get('id')).exists():
                continue
                
            subject = email_data.get('subject', '')
            snippet = email_data.get('snippet', '')
            
            category, is_important = analyze_email_content(subject, snippet)
            
            try:
                received_at = datetime.fromtimestamp(int(email_data.get('internalDate', 0)) / 1000.0)
                received_at = make_aware(received_at)
            except Exception:
                received_at = make_aware(datetime.now())

            email_obj = AnalyzedEmail.objects.create(
                user=request.user,
                message_id=email_data.get('id'),
                sender=email_data.get('sender', 'Unknown'),
                subject=subject,
                snippet=snippet,
                category=category,
                is_important=is_important,
                received_at=received_at
            )
            
            # Embed and store in RAG
            add_email_to_rag(email_obj)
            
            processed.append(AnalyzedEmailSerializer(email_obj).data)
            
        return Response({
            'message': f'Processed {len(processed)} new emails',
            'emails': processed
        }, status=status.HTTP_200_OK)

class ChatInboxView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        query = request.data.get('query')
        if not query:
            return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        answer = chat_with_inbox(request.user.id, query)
        return Response({'answer': answer}, status=status.HTTP_200_OK)
