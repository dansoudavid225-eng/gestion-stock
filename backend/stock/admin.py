from django.contrib import admin
from .models import Product, StockEntry, Sale, Loss, InventoryAdjustment, DayClosure, ShopSettings

admin.site.register(Product)
admin.site.register(StockEntry)
admin.site.register(Sale)
admin.site.register(Loss)
admin.site.register(InventoryAdjustment)
admin.site.register(DayClosure)
admin.site.register(ShopSettings)
