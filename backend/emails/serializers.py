from rest_framework import serializers
from .models import AnalyzedEmail

class AnalyzedEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyzedEmail
        fields = '__all__'
        read_only_fields = ('user', 'created_at')
