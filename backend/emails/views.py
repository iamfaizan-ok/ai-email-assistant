import json
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import AnalyzedEmail
from .serializers import AnalyzedEmailSerializer
from datetime import datetime
from django.utils.timezone import make_aware

# Dummy AI Analyzer for demonstration
def analyze_email_content(subject, snippet):
    content = f"{subject} {snippet}".lower()
    job_keywords = ['internship', 'hiring', 'offer', 'job', 'interview', 'application', 'career']
    
    for kw in job_keywords:
        if kw in content:
            return 'Job-Related', True
            
    return 'Other', False

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
                # Basic parsing for date (assuming ISO format from frontend/extension)
                # In production, more robust date parsing is needed
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
            processed.append(AnalyzedEmailSerializer(email_obj).data)
            
        return Response({
            'message': f'Processed {len(processed)} new emails',
            'emails': processed
        }, status=status.HTTP_200_OK)
