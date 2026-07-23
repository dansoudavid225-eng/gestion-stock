from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'sales', views.SaleViewSet, basename='sale')
router.register(r'losses', views.LossViewSet, basename='loss')
router.register(r'adjustments', views.InventoryAdjustmentViewSet, basename='adjustment')
router.register(r'stock-entries', views.StockEntryViewSet, basename='stockentry')
router.register(r'customers', views.CustomerViewSet, basename='customer')
router.register(r'day-closures', views.DayClosureViewSet, basename='dayclosure')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('rapport-pdf/', views.rapport_pdf, name='rapport_pdf'),
    path('export-excel/', views.export_excel, name='export_excel'),
    path('ecarts-vendeurs/', views.ecarts_vendeurs, name='ecarts_vendeurs'),
    path('credits/', views.credits, name='credits'),
    path('shop-settings/', views.shop_settings, name='shop_settings'),
]
