from django.shortcuts import render

# Create your views here.

def chat_widget(request):
    """独立的聊天助手页面视图"""
    return render(request, 'ai_assistant/chat_widget_standalone.html')
