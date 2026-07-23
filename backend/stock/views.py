import datetime
import csv
import os
import mimetypes
from io import BytesIO
from wsgiref.util import FileWrapper
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from openpyxl import Workbook
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.conf import settings
from django.db import transaction
from django.db.models import Sum, F, Q, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.http import HttpResponse, FileResponse
from .models import Product, StockEntry, Sale, Loss, InventoryAdjustment, DayClosure, ShopSettings, Customer
from .permissions import IsGerant
from .serializers import (
    UserSerializer, RegisterSerializer, ProductSerializer, ProductListSerializer,
    StockEntrySerializer, SaleSerializer, SaleCreateSerializer,
    LossSerializer, InventoryAdjustmentSerializer, DayClosureSerializer, CustomerSerializer
)


def _set_auth_cookies(response, access_token, refresh_token):
    secure = not settings.DEBUG
    response.set_cookie('access_token', access_token, httponly=True, secure=secure, samesite='Lax', path='/', max_age=1800)
    response.set_cookie('refresh_token', refresh_token, httponly=True, secure=secure, samesite='Lax', path='/', max_age=86400)


def _clear_auth_cookies(response):
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/')


@api_view(['POST'])
@permission_classes([AllowAny])
def cookie_login(request):
    serializer = TokenObtainPairSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    user = serializer.user
    response = Response({
        'user': UserSerializer(user).data,
        'access': data['access'],
        'refresh': data['refresh'],
    })
    _set_auth_cookies(response, data['access'], data['refresh'])
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def cookie_refresh(request):
    refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Refresh token required'}, status=401)
    try:
        refresh = RefreshToken(refresh_token)
        access = str(refresh.access_token)
        refresh.rotate()
        response = Response({'access': access})
        _set_auth_cookies(response, access, str(refresh))
        return response
    except Exception:
        return Response({'error': 'Invalid refresh token'}, status=401)


@api_view(['POST'])
@permission_classes([AllowAny])
def cookie_logout(request):
    response = Response({'status': 'ok'})
    _clear_auth_cookies(response)
    return response


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def current_user(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        response = Response({
            'user': UserSerializer(user).data,
            'access': access,
            'refresh': str(refresh),
        }, status=201)
        _set_auth_cookies(response, access, str(refresh))
        return response
    return Response(serializer.errors, status=400)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'add_stock']:
            return [IsAuthenticated(), IsGerant()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Product.objects.all()
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(category__icontains=search))
        return qs

    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        product = self.get_object()
        quantity = request.data.get('quantity', 0)
        unit_price = request.data.get('unit_price', 0)
        supplier = request.data.get('supplier', '')

        try:
            quantity = int(quantity)
            unit_price = float(unit_price)
        except (ValueError, TypeError):
            return Response({'error': 'Quantité ou prix invalide'}, status=400)

        if quantity <= 0:
            return Response({'error': 'La quantité doit être positive'}, status=400)
        if unit_price < 0:
            return Response({'error': 'Le prix unitaire ne peut pas être négatif'}, status=400)

        product.stock = F('stock') + quantity
        product.save(update_fields=['stock'])
        product.refresh_from_db()

        StockEntry.objects.create(
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            supplier=supplier,
            created_by=request.user
        )

        return Response(ProductSerializer(product).data)


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return SaleCreateSerializer
        return SaleSerializer

    def get_queryset(self):
        qs = Sale.objects.all()
        if not self.request.user.is_staff:
            qs = qs.filter(created_by=self.request.user)
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        product = self.request.query_params.get('product')
        if product:
            qs = qs.filter(product_id=product)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']
        payment_method = serializer.validated_data.get('payment_method', 'cash')
        client_name = serializer.validated_data.get('client_name', '')

        today_closed = DayClosure.objects.filter(date=timezone.now().date()).exists()
        if today_closed:
            raise ValidationError("La journée est déjà clôturée. Impossible d'enregistrer une vente.")

        if product.stock < quantity:
            raise ValidationError(
                f"Stock insuffisant pour {product.name}: {product.stock} disponible(s)"
            )

        total = product.selling_price * quantity
        product.stock = F('stock') - quantity
        product.save(update_fields=['stock'])
        product.refresh_from_db()

        is_credit = payment_method == 'credit'

        serializer.save(
            unit_price=product.selling_price,
            total=total,
            payment_method=payment_method,
            is_credit=is_credit,
            settled=not is_credit,
            created_by=self.request.user
        )


class LossViewSet(viewsets.ModelViewSet):
    queryset = Loss.objects.all()
    serializer_class = LossSerializer
    permission_classes = [IsAuthenticated, IsGerant]

    @transaction.atomic
    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']

        if product.stock < quantity:
            raise ValidationError(
                f"Stock insuffisant pour {product.name}: {product.stock} disponible(s)"
            )

        product.stock = F('stock') - quantity
        product.save(update_fields=['stock'])
        product.refresh_from_db()

        serializer.save(created_by=self.request.user)


class InventoryAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = InventoryAdjustment.objects.all()
    serializer_class = InventoryAdjustmentSerializer
    permission_classes = [IsAuthenticated, IsGerant]

    @transaction.atomic
    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        new_quantity = serializer.validated_data['new_quantity']

        if new_quantity < 0:
            raise ValidationError("La nouvelle quantité ne peut pas être négative")

        old_quantity = product.stock
        delta = new_quantity - old_quantity

        product.stock = F('stock') + delta
        product.save(update_fields=['stock'])
        product.refresh_from_db()

        serializer.save(
            old_quantity=old_quantity,
            new_quantity=new_quantity,
            created_by=self.request.user
        )


class StockEntryViewSet(viewsets.ModelViewSet):
    queryset = StockEntry.objects.all()
    serializer_class = StockEntrySerializer
    permission_classes = [IsAuthenticated, IsGerant]


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsGerant]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated, IsGerant]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RegisterSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        if 'password' in serializer.validated_data and serializer.validated_data['password']:
            user.set_password(serializer.validated_data['password'])
            user.save()

    def perform_update(self, serializer):
        user = serializer.save()
        if 'password' in serializer.validated_data:
            user.set_password(serializer.validated_data['password'])
            user.save()


class DayClosureViewSet(viewsets.ModelViewSet):
    queryset = DayClosure.objects.all()
    serializer_class = DayClosureSerializer
    permission_classes = [IsAuthenticated, IsGerant]

    def perform_create(self, serializer):
        today = timezone.now().date()
        if DayClosure.objects.filter(date=today).exists():
            raise ValidationError("Cette journée est déjà clôturée.")
        serializer.save(date=today, closed_by=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    today = timezone.now().date()
    start_of_day = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))
    end_of_day = timezone.make_aware(datetime.datetime.combine(today, datetime.time.max))

    sales_today = Sale.objects.filter(date__gte=start_of_day, date__lte=end_of_day)
    total_sales_today = sales_today.aggregate(total=Sum('total'))['total'] or 0
    sales_count_today = sales_today.count()

    total_revenue = Sale.objects.filter(is_credit=False).aggregate(total=Sum('total'))['total'] or 0
    total_credit = Sale.objects.filter(is_credit=True, settled=False).aggregate(total=Sum('total'))['total'] or 0

    low_stock_products = Product.objects.filter(stock__lte=F('min_stock'), is_active=True)
    out_of_stock = Product.objects.filter(stock=0, is_active=True)

    top_products = Sale.objects.values('product_id').annotate(
        total_qty=Sum('quantity'),
        total_rev=Sum('total')
    ).order_by('-total_qty')[:10]

    product_ids = [p['product_id'] for p in top_products]
    products_map = {p.id: p for p in Product.objects.filter(id__in=product_ids)}

    is_gerant = request.user.is_staff
    top_with_margin = []
    for p in top_products:
        product = products_map.get(p['product_id'])
        margin = (product.selling_price - product.purchase_price) * p['total_qty'] if (is_gerant and product) else 0
        top_with_margin.append({
            'product__name': product.name if product else 'Inconnu',
            'total_qty': p['total_qty'],
            'total_rev': p['total_rev'],
            'margin': margin,
        })

    day_closed = DayClosure.objects.filter(date=today).exists()

    total_margin = sum(
        (s.product.selling_price - s.product.purchase_price) * s.quantity
        for s in Sale.objects.filter(is_credit=False).select_related('product')
    )

    sales_by_day = (
        Sale.objects
        .filter(is_credit=False)
        .annotate(day=TruncDate('date'))
        .values('day')
        .annotate(total=Sum('total'), count=Count('id'))
        .order_by('day')[:30]
    )

    return Response({
        'today': {
            'sales_count': sales_count_today,
            'total_sales': total_sales_today,
        },
        'overall': {
            'total_revenue': total_revenue,
            'total_credit': total_credit,
            'total_margin': total_margin,
        },
        'low_stock_products': ProductListSerializer(low_stock_products, many=True).data,
        'out_of_stock': ProductListSerializer(out_of_stock, many=True).data,
        'top_products': top_with_margin,
        'day_closed': day_closed,
        'sales_by_day': sales_by_day,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rapport_pdf(request):
    start_date = request.query_params.get('start_date', timezone.now().date().isoformat())
    end_date = request.query_params.get('end_date', timezone.now().date().isoformat())

    sales = Sale.objects.filter(date__date__gte=start_date, date__date__lte=end_date).select_related('product', 'created_by')
    if not request.user.is_staff:
        sales = sales.filter(created_by=request.user)

    total = sales.aggregate(t=Sum('total'))['t'] or 0
    qty = sales.aggregate(q=Sum('quantity'))['q'] or 0

    buf = BytesIO()
    doc = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    doc.setTitle(f"Rapport de ventes du {start_date} au {end_date}")

    doc.setFont("Helvetica-Bold", 18)
    doc.drawString(50, height - 50, "Rapport de ventes")

    doc.setFont("Helvetica", 12)
    doc.drawString(50, height - 75, f"Période : {start_date} au {end_date}")
    doc.drawString(50, height - 95, f"Total ventes : {int(total):,} FCFA")
    doc.drawString(50, height - 115, f"Produits vendus : {int(qty)}")

    doc.setFont("Helvetica-Bold", 14)
    doc.drawString(50, height - 145, "Détail des ventes")

    data = [["Produit", "Qté", "Prix unit.", "Total", "Paiement", "Date"]]
    for s in sales:
        data.append([
            s.product.name, str(s.quantity), f"{int(s.unit_price):,}",
            f"{int(s.total):,}", s.get_payment_method_display(),
            s.date.strftime("%d/%m/%Y %H:%M")
        ])

    table = Table(data, colWidths=[120, 40, 80, 80, 80, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ]))

    table.wrapOn(doc, width, height)
    table.drawOn(doc, 50, height - 170 - len(data) * 20)

    doc.showPage()
    doc.save()
    buf.seek(0)

    response = HttpResponse(buf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="rapport_ventes_{start_date}_{end_date}.pdf"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsGerant])
def export_excel(request):
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    sales = Sale.objects.select_related('product', 'created_by').all()
    if start_date:
        sales = sales.filter(date__date__gte=start_date)
    if end_date:
        sales = sales.filter(date__date__lte=end_date)

    wb = Workbook()
    ws = wb.active
    ws.title = "Ventes"
    ws.append(["Produit", "Quantité", "Prix unitaire", "Total", "Paiement", "Vendeur", "Client", "Date"])

    for s in sales:
        ws.append([
            s.product.name, s.quantity, float(s.unit_price), float(s.total),
            s.get_payment_method_display(), s.created_by.username if s.created_by else '',
            s.client_name or '', s.date.strftime("%d/%m/%Y %H:%M")
        ])

    ws2 = wb.create_sheet("Produits")
    ws2.append(["Nom", "Catégorie", "Stock", "Seuil", "Prix vente", "Prix achat"])
    for p in Product.objects.filter(is_active=True):
        ws2.append([p.name, p.category, p.stock, p.min_stock, float(p.selling_price), float(p.purchase_price)])

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    response = HttpResponse(buf, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename="export_gestion_stock.xlsx"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsGerant])
def ecarts_vendeurs(request):
    today = timezone.now().date()
    start_of_day = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))
    end_of_day = timezone.make_aware(datetime.datetime.combine(today, datetime.time.max))

    vendeurs = User.objects.filter(is_staff=False, sale__date__gte=start_of_day, sale__date__lte=end_of_day).distinct()
    ecarts = []
    for v in vendeurs:
        total_vendu = Sale.objects.filter(created_by=v, date__gte=start_of_day, date__lte=end_of_day).aggregate(
            t=Sum('total')
        )['t'] or 0
        nb_ventes = Sale.objects.filter(created_by=v, date__gte=start_of_day, date__lte=end_of_day).count()
        ecarts.append({
            'vendeur': v.username,
            'nb_ventes': nb_ventes,
            'total_vendu': total_vendu,
        })

    return Response(ecarts)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, IsGerant])
def shop_settings(request):
    s, _ = ShopSettings.objects.get_or_create(id=1)
    if request.method == 'PUT':
        s.name = request.data.get('name', s.name)
        s.phone = request.data.get('phone', s.phone)
        s.address = request.data.get('address', s.address)
        if 'logo' in request.FILES:
            logo = request.FILES['logo']
            if logo.size > 5 * 1024 * 1024:
                return Response({'error': 'Le logo ne doit pas dépasser 5 Mo'}, status=400)
            if logo.content_type not in ['image/jpeg', 'image/png', 'image/webp', 'image/gif']:
                return Response({'error': 'Format d\'image non supporté'}, status=400)
            s.logo = logo
        s.save()
    return Response({
        'name': s.name,
        'phone': s.phone,
        'address': s.address,
        'logo': request.build_absolute_uri(s.logo.url) if s.logo else None,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsGerant])
def credits(request):
    if request.method == 'GET':
        credits = Sale.objects.filter(is_credit=True).select_related('product', 'created_by').order_by('-date')
        data = []
        for c in credits:
            data.append({
                'id': c.id,
                'product_name': c.product.name,
                'quantity': c.quantity,
                'total': c.total,
                'client_name': c.client_name or 'Inconnu',
                'date': c.date,
                'settled': c.settled,
                'created_by_name': c.created_by.username if c.created_by else '',
            })
        return Response(data)

    elif request.method == 'POST':
        sale_id = request.data.get('sale_id')
        try:
            sale = Sale.objects.get(id=sale_id, is_credit=True)
            sale.settled = True
            sale.save(update_fields=['settled'])
            return Response({'status': 'ok'})
        except Sale.DoesNotExist:
            return Response({'error': 'Vente introuvable'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_media(request, path):
    file_path = os.path.normpath(os.path.join(settings.MEDIA_ROOT, path))
    if not file_path.startswith(settings.MEDIA_ROOT):
        return Response({'error': 'Accès refusé'}, status=403)
    if not os.path.isfile(file_path):
        return Response({'error': 'Fichier introuvable'}, status=404)
    content_type, _ = mimetypes.guess_type(file_path)
    response = FileResponse(open(file_path, 'rb'), content_type=content_type or 'application/octet-stream')
    response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
    return response
