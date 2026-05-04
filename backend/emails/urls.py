from django.urls import path
from .views import EmailListView, ProcessEmailView

urlpatterns = [
    path('', EmailListView.as_view(), name='email_list'),
    path('process/', ProcessEmailView.as_view(), name='process_emails'),
]
