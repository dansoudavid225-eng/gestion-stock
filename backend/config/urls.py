from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from stock import views

urlpatterns = [
    path('gestion-admin/', admin.site.urls),
    path('api/', include('stock.urls')),
    path('api/auth/login/', views.cookie_login, name='token_obtain_pair'),
    path('api/auth/refresh/', views.cookie_refresh, name='token_refresh'),
    path('api/auth/logout/', views.cookie_logout, name='token_logout'),
    path('api/auth/me/', views.current_user, name='current_user'),
    path('api/auth/register/', views.register, name='register'),
    path('api/media/<path:path>', views.serve_media, name='serve_media'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
