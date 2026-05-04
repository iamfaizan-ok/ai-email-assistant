from django.db import models
from django.conf import settings

class AnalyzedEmail(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='emails')
    message_id = models.CharField(max_length=255, unique=True)
    sender = models.CharField(max_length=255)
    subject = models.CharField(max_length=500)
    snippet = models.TextField()
    category = models.CharField(max_length=50) # e.g., 'Job-Related', 'Promotional'
    is_important = models.BooleanField(default=False)
    received_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return self.subject
