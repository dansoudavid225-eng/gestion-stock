from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Product, StockEntry, Sale, Loss, InventoryAdjustment, DayClosure, Customer


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff']
        read_only_fields = ['is_staff']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'is_staff']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            self.fields['password'].required = False

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'purchase_price', 'selling_price', 'stock', 'min_stock', 'photo', 'is_active', 'created_at', 'updated_at']

    def validate_photo(self, value):
        if value:
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("La photo ne doit pas dépasser 5 Mo")
            if value.content_type not in ['image/jpeg', 'image/png', 'image/webp', 'image/gif']:
                raise serializers.ValidationError("Format d'image non supporté (JPEG, PNG, WebP, GIF uniquement)")
        return value

    def validate_selling_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix de vente ne peut pas être négatif")
        return value

    def validate_purchase_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix d'achat ne peut pas être négatif")
        return value


class ProductListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'selling_price', 'stock', 'min_stock', 'photo', 'is_active']


class StockEntrySerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = StockEntry
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'supplier', 'date', 'created_by', 'created_by_name']
        read_only_fields = ['date', 'created_by']


class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Sale
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'total', 'payment_method', 'date', 'created_by', 'created_by_name', 'client_name', 'is_credit', 'settled']
        read_only_fields = ['unit_price', 'total', 'date', 'created_by', 'is_credit', 'settled']


class SaleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = ['product', 'quantity', 'payment_method', 'client_name']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être positive")
        return value


class LossSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = Loss
        fields = ['id', 'product', 'product_name', 'quantity', 'reason', 'date', 'created_by']
        read_only_fields = ['date', 'created_by']


class InventoryAdjustmentSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = InventoryAdjustment
        fields = ['id', 'product', 'product_name', 'old_quantity', 'new_quantity', 'reason', 'date', 'created_by', 'created_by_name']
        read_only_fields = ['old_quantity', 'created_by', 'date']


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class DayClosureSerializer(serializers.ModelSerializer):
    closed_by_name = serializers.ReadOnlyField(source='closed_by.username')

    class Meta:
        model = DayClosure
        fields = ['id', 'date', 'closed_by', 'closed_by_name', 'closed_at']
        read_only_fields = ['date', 'closed_by', 'closed_at']
