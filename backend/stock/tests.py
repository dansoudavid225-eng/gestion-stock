from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Product, Sale, StockEntry, Loss, InventoryAdjustment, DayClosure


class ProductModelTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name='Test Produit', selling_price=2500, stock=10, min_stock=2
        )

    def test_product_creation(self):
        self.assertEqual(self.product.name, 'Test Produit')
        self.assertEqual(self.product.stock, 10)
        self.assertEqual(str(self.product), 'Test Produit')

    def test_low_stock_threshold(self):
        self.assertFalse(self.product.stock <= self.product.min_stock)
        self.product.stock = 1
        self.product.save()
        self.assertTrue(self.product.stock <= self.product.min_stock)


class SaleModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='test123')
        self.product = Product.objects.create(name='Article', selling_price=1000, purchase_price=700, stock=20)

    def test_sale_deducts_stock(self):
        old_stock = self.product.stock
        quantity = 3
        self.product.stock -= quantity
        self.product.save()
        self.assertEqual(self.product.stock, old_stock - quantity)

    def test_margin_calculation(self):
        quantity = 5
        margin = (self.product.selling_price - self.product.purchase_price) * quantity
        self.assertEqual(margin, (1000 - 700) * 5)


class APITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='admin123', email='a@a.com')
        self.vendeur = User.objects.create_user(username='vendeur', password='vendeur123')
        self.product = Product.objects.create(name='Huile', selling_price=2500, stock=50, min_stock=5)

    def get_token(self, username='admin', password='admin123'):
        res = self.client.post('/api/auth/login/', {'username': username, 'password': password}, format='json')
        return res.data['access']

    def authenticate(self, username='admin', password='admin123'):
        token = self.get_token(username, password)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_login(self):
        res = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'admin123'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)

    def test_login_invalid(self):
        res = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'wrong'}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_list_products_unauthenticated(self):
        res = self.client.get('/api/products/')
        self.assertEqual(res.status_code, 401)

    def test_list_products_authenticated(self):
        self.authenticate()
        res = self.client.get('/api/products/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_create_product_as_vendeur(self):
        self.authenticate('vendeur', 'vendeur123')
        res = self.client.post('/api/products/', {'name': 'Interdit', 'selling_price': 1000}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_create_product_as_admin(self):
        self.authenticate()
        res = self.client.post('/api/products/', {'name': 'Riz 5kg', 'selling_price': 4500, 'stock': 20}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Product.objects.count(), 2)

    def test_add_stock(self):
        self.authenticate()
        res = self.client.post(f'/api/products/{self.product.id}/add_stock/', {'quantity': 10}, format='json')
        self.assertEqual(res.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 60)

    def test_create_sale_deducts_stock(self):
        self.authenticate()
        res = self.client.post('/api/sales/', {'product': self.product.id, 'quantity': 3}, format='json')
        self.assertEqual(res.status_code, 201)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 47)

    def test_create_sale_insufficient_stock(self):
        self.authenticate()
        res = self.client.post('/api/sales/', {'product': self.product.id, 'quantity': 999}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_create_sale_after_day_closure(self):
        self.authenticate()
        self.client.post('/api/day-closures/', {}, format='json')
        res = self.client.post('/api/sales/', {'product': self.product.id, 'quantity': 1}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('clôturée', str(res.data))

    def test_dashboard_endpoint(self):
        self.authenticate()
        res = self.client.get('/api/dashboard/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('today', res.data)
        self.assertIn('overall', res.data)

    def test_vendeur_sees_only_own_sales(self):
        self.authenticate()
        self.client.post('/api/sales/', {'product': self.product.id, 'quantity': 2}, format='json')
        self.authenticate('vendeur', 'vendeur123')
        res = self.client.get('/api/sales/')
        self.assertEqual(len(res.data), 0)

    def test_credit_creation(self):
        self.authenticate()
        res = self.client.post('/api/sales/', {
            'product': self.product.id, 'quantity': 1,
            'payment_method': 'credit', 'client_name': 'Paul'
        }, format='json')
        self.assertEqual(res.status_code, 201)
        sale = Sale.objects.first()
        self.assertTrue(sale.is_credit)
        self.assertFalse(sale.settled)

    def test_mark_credit_settled(self):
        self.authenticate()
        self.client.post('/api/sales/', {
            'product': self.product.id, 'quantity': 1,
            'payment_method': 'credit', 'client_name': 'Paul'
        }, format='json')
        sale = Sale.objects.first()
        res = self.client.post('/api/credits/', {'sale_id': sale.id}, format='json')
        self.assertEqual(res.status_code, 200)
        sale.refresh_from_db()
        self.assertTrue(sale.settled)

    def test_loss_creation(self):
        self.authenticate()
        res = self.client.post('/api/losses/', {'product': self.product.id, 'quantity': 2, 'reason': 'Cassé'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 48)

    def test_inventory_adjustment(self):
        self.authenticate()
        res = self.client.post('/api/adjustments/', {'product': self.product.id, 'new_quantity': 30, 'reason': 'Inventaire'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 30)

    def test_day_closure(self):
        self.authenticate()
        res = self.client.post('/api/day-closures/', {}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(DayClosure.objects.exists())

    def test_duplicate_day_closure(self):
        self.authenticate()
        self.client.post('/api/day-closures/', {}, format='json')
        res = self.client.post('/api/day-closures/', {}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_rapport_pdf(self):
        self.authenticate()
        res = self.client.get('/api/rapport-pdf/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'application/pdf')

    def test_export_excel(self):
        self.authenticate()
        res = self.client.get('/api/export-excel/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('spreadsheetml', res['Content-Type'])

    def test_shop_settings(self):
        self.authenticate()
        res = self.client.get('/api/shop-settings/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('name', res.data)

    def test_shop_settings_update(self):
        self.authenticate()
        res = self.client.put('/api/shop-settings/', {'name': 'Ma Boutique', 'phone': '+229123'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['name'], 'Ma Boutique')

    def test_vendeur_cannot_access_credits(self):
        self.authenticate('vendeur', 'vendeur123')
        res = self.client.get('/api/credits/')
        self.assertEqual(res.status_code, 403)

    def test_vendeur_cannot_access_ecarts(self):
        self.authenticate('vendeur', 'vendeur123')
        res = self.client.get('/api/ecarts-vendeurs/')
        self.assertEqual(res.status_code, 403)
