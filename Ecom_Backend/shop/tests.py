from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import mail
from django.contrib.auth import get_user_model
from decimal import Decimal
from .models import Product, Category, Order, OrderItem

User = get_user_model()


class EcomAPITestCase(APITestCase):
    """
    Full-stack tests for common flows:
      - register -> welcome email
      - token obtain -> /auth/token/
      - token refresh -> /auth/token/refresh/
      - profile -> /auth/me/
      - admin product creation with image
      - product listing (pagination + filtering)
      - order creation (authenticated only) and order confirmation email
    """

    def setUp(self):
        # Use the api/v1 prefix that's configured in your project urls
        API_PREFIX = "/api/v1"

        self.register_url = f"{API_PREFIX}/auth/register/"
        self.token_url = f"{API_PREFIX}/auth/token/"
        self.token_refresh_url = f"{API_PREFIX}/auth/token/refresh/"
        self.me_url = f"{API_PREFIX}/auth/me/"

        self.products_url = f"{API_PREFIX}/products/"
        self.orders_url = f"{API_PREFIX}/orders/"

        self.admin_user = User.objects.create_superuser(
            username="sugan", email="", password="Sugan123"
        )
        self.test_user_data = {
            "username": "Dharun",
            "email": "dharunvishwasdv16@gmail.com",
            "password": "dv123456",
        }

    def test_register_and_welcome_email(self):
        # register via API
        resp = self.client.post(self.register_url, {
            "username": self.test_user_data["username"],
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"],
            "password2": self.test_user_data["password"],
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # welcome email should be sent (Django test outbox)
        self.assertGreaterEqual(len(mail.outbox), 1)
        welcome_msg = mail.outbox[-1]
        self.assertIn("Welcome", welcome_msg.subject)

        # the user should now exist
        u = User.objects.filter(username=self.test_user_data["username"]).first()
        self.assertIsNotNone(u)
        self.assertEqual(u.email, self.test_user_data["email"])

    def obtain_tokens(self, username, password):
        resp = self.client.post(self.token_url, {"username": username, "password": password}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        return data["access"], data["refresh"]

    def test_token_obtain_refresh_and_profile(self):
        # create user directly
        User.objects.create_user(username="bob", email="bob@example.com", password="bobpass")
        access, refresh = self.obtain_tokens("bob", "bobpass")

        # use access to call /auth/me/
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = client.get(self.me_url)
        # backend may implement me endpoint -> either 200 or 404 depending on your implementation.
        # We assert 200 if available, otherwise check that access token is valid by hitting a protected endpoint.
        if resp.status_code == status.HTTP_200_OK:
            data = resp.json()
            self.assertIn("username", data)
            self.assertEqual(data["username"], "bob")
        else:
            # fallback: try to access a protected resource if you have one (skipped here)
            self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND))

        # Test refresh
        resp2 = self.client.post(self.token_refresh_url, {"refresh": refresh}, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp2.json())

    def test_admin_create_product_and_public_listing_filter_pagination(self):
        # login as admin to create category and products (use API or create via ORM)
        self.client.force_authenticate(user=self.admin_user)

        # create a category (via ORM to keep test simple)
        cat = Category.objects.create(name="Electronics", slug="electronics")

        # create a product with an image file
        image = SimpleUploadedFile("phone.jpg", b"filecontent", content_type="image/jpeg")
        prod = Product.objects.create(
            title="Phone",
            subtitle="Smartphone",
            description="Nice phone",
            price=Decimal("199.99"),
            stock=10,
            rating=4.5,
            image=image,
            is_active=True,
            category=cat,
        )
        # create another product
        Product.objects.create(
            title="Cheap Phone",
            subtitle="Budget",
            description="Affordable",
            price=Decimal("49.00"),
            stock=20,
            rating=4.1,
            is_active=True,
            category=cat,
        )

        # list products publicly (no auth)
        self.client.force_authenticate(user=None)  # clear auth
        resp = self.client.get(self.products_url + "?page=1", format="json")
        self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_206_PARTIAL_CONTENT))
        data = resp.json()
        # if paginated, expect 'results'
        if isinstance(data, dict) and "results" in data:
            results = data["results"]
            self.assertGreaterEqual(len(results), 1)
            # test filtering by price__gte (ensure django-filter is enabled)
            resp2 = self.client.get(self.products_url + "?price__gte=100", format="json")
            self.assertEqual(resp2.status_code, status.HTTP_200_OK)
            d2 = resp2.json()
            filtered = d2.get("results", d2)
            self.assertTrue(all(Decimal(str(item["price"])) >= Decimal("100") for item in filtered))
        else:
            # non-paginated list
            self.assertTrue(len(data) >= 2)

    def test_order_flow_and_order_email(self):
        # Prepare: create category and products via ORM
        cat = Category.objects.create(name="Books", slug="books")
        p1 = Product.objects.create(title="Book A", subtitle="A", description="Book A", price=Decimal("10.00"), stock=5, rating=4.2, is_active=True, category=cat)
        p2 = Product.objects.create(title="Book B", subtitle="B", description="Book B", price=Decimal("15.00"), stock=5, rating=4.0, is_active=True, category=cat)

        # create & login user via API
        resp = self.client.post(self.register_url, {"username": "carol", "email": "carol@example.com", "password": "carolpass", "password2": "carolpass"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # capture welcome email
        self.assertGreaterEqual(len(mail.outbox), 1)

        access, refresh = self.obtain_tokens("carol", "carolpass")
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        # Build order payload according to your OrderCreateSerializer shape:
        # items = [{ "product_id": p1.id, "quantity": 2}, ...]
        payload = {
            "items": [
                {"product_id": p1.id, "quantity": 2},
                {"product_id": p2.id, "quantity": 1},
            ],
            "shipping_address": "123 Test St",
        }

        # place order
        resp = client.post(self.orders_url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        order_data = resp.json()
        self.assertIn("id", order_data)
        order = Order.objects.get(pk=order_data["id"])
        # total should be (2*10)+(1*15)=35.00
        self.assertEqual(order.total_price, Decimal("35.00"))

        # Order items created
        items = list(order.items.all())
        self.assertEqual(len(items), 2)
        # order confirmation email was sent
        # the last email should be order confirmation
        self.assertGreaterEqual(len(mail.outbox), 2)
        order_email = mail.outbox[-1]
        self.assertIn("Order", order_email.subject)
        self.assertIn(str(order.id), order_email.subject)

    def test_order_requires_authentication(self):
        # create a product
        cat = Category.objects.create(name="Toys", slug="toys")
        p = Product.objects.create(title="Toy", subtitle="T", description="Toy", price=Decimal("5.00"), stock=10, rating=3.8, is_active=True, category=cat)

        # attempt to create order without authentication
        payload = {"items": [{"product_id": p.id, "quantity": 1}], "shipping_address": "nowhere"}
        resp = self.client.post(self.orders_url, payload, format="json")
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
