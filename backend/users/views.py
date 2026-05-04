from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from django.contrib.auth import get_user_model
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests

User = get_user_model()

class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        id_token_str = request.data.get('id_token')
        access_token_str = request.data.get('access_token')

        email = None
        name = ''

        if id_token_str:
            try:
                idinfo = id_token.verify_oauth2_token(id_token_str, requests.Request(), settings.GOOGLE_OAUTH2_CLIENT_ID)
                email = idinfo.get('email')
                name = idinfo.get('name', '')
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        elif access_token_str:
            import requests as py_requests
            # Verify the access_token by calling Google's userinfo endpoint
            resp = py_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token_str}'}
            )
            if resp.status_code == 200:
                userinfo = resp.json()
                email = userinfo.get('email')
                name = userinfo.get('name', '')
            else:
                return Response({'error': 'Invalid access_token'}, status=status.HTTP_400_BAD_REQUEST)
        
        else:
            return Response({'error': 'No id_token or access_token provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not email:
            return Response({'error': 'No email found in token'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create the user
        user, created = User.objects.get_or_create(email=email)
        if created:
            user.name = name
            user.set_unusable_password()
            user.save()

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)

class UserProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user
