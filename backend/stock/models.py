from django.db import models
from django.contrib.auth.models import User


class Product(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100, blank=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    photo = models.ImageField(upload_to='products/', blank=True, null=True)
    stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class StockEntry(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='entries')
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    supplier = models.CharField(max_length=200, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.product.name} +{self.quantity}"


class Sale(models.Model):
    PAYMENT_CHOICES = [
        ('cash', 'Espèces'),
        ('momo', 'Mobile Money'),
        ('credit', 'À crédit'),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales')
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_CHOICES, default='cash')
    date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    client_name = models.CharField(max_length=200, blank=True, null=True)
    is_credit = models.BooleanField(default=False)
    settled = models.BooleanField(default=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"


class Loss(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='losses')
    quantity = models.IntegerField()
    reason = models.CharField(max_length=300)
    date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.product.name} -{self.quantity} ({self.reason})"


class InventoryAdjustment(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='adjustments')
    old_quantity = models.IntegerField()
    new_quantity = models.IntegerField()
    reason = models.TextField()
    date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.product.name}: {self.old_quantity} -> {self.new_quantity}"


class DayClosure(models.Model):
    date = models.DateField(unique=True)
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    closed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Clôture du {self.date}"


class Customer(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    total_purchases = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ShopSettings(models.Model):
    name = models.CharField(max_length=200, default='Ma Boutique')
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    logo = models.ImageField(upload_to='shop/', blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Paramètres de la boutique'

    def __str__(self):
        return self.name
