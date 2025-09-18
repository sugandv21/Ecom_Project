# shop/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Product, Order, OrderItem
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add extra user info to the payload
        token["username"] = user.username
        token["email"] = user.email
        return token



class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "password2")

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError({"username": "Username already exists."})
        email = data.get("email")
        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "Email already exists."})
        return data

    def create(self, validated_data):
        validated_data.pop("password2", None)
        password = validated_data.pop("password")
        username = validated_data.get("username")
        email = validated_data.get("email", "")
        # Use create_user to ensure password hashing and default fields are handled
        user = User.objects.create_user(username=username, email=email, password=password)
        return user


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        write_only=True, queryset=Category.objects.all(), source="category"
    )
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "subtitle",
            "description",
            "price",
            "stock",
            "rating",
            "image",
            "image_url",
            "created",
            "is_active",
            "category",
            "category_id",
        ]

    def get_image_url(self, obj):
        # Return absolute URL when request is in context, else return relative url or None
        request = self.context.get("request")
        if not obj.image:
            return None
        try:
            url = obj.image.url
        except Exception:
            return None
        if request is None:
            return url
        return request.build_absolute_uri(url)


class OrderItemSerializer(serializers.ModelSerializer):
    # read-only nested product info for responses
    product = ProductSerializer(read_only=True)
    # write-only numeric id; source="product" will convert id -> Product instance on validation
    product_id = serializers.PrimaryKeyRelatedField(
        write_only=True, queryset=Product.objects.all(), source="product"
    )

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_id", "quantity", "price_snapshot"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField()

    class Meta:
        model = Order
        fields = ["id", "user", "status", "total_price", "shipping_address", "created_at", "items"]


class OrderCreateSerializer(serializers.ModelSerializer):
    # Accept list of dicts for items (flexible shape)
    items = serializers.ListField(child=serializers.DictField(), write_only=True)

    class Meta:
        model = Order
        fields = ["id", "items", "shipping_address"]

    def validate(self, data):
        items = data.get("items") or []
        if not items or len(items) == 0:
            raise serializers.ValidationError({"items": "Order must contain at least one item."})
        # basic per-item validation here (quantity numeric & >0)
        for idx, item in enumerate(items):
            qty = item.get("quantity", 1)
            try:
                q = int(qty)
                if q <= 0:
                    raise serializers.ValidationError({f"items[{idx}].quantity": "Quantity must be at least 1."})
            except (ValueError, TypeError):
                raise serializers.ValidationError({f"items[{idx}].quantity": "Quantity must be an integer."})
        return data

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            raise serializers.ValidationError({"detail": "Authentication required."})

        items_data = validated_data.pop("items", [])
        shipping_address = validated_data.get("shipping_address", "")

        order = Order.objects.create(user=user, shipping_address=shipping_address, total_price=0)
        total = 0
        item_errors = []

        for idx, raw_item in enumerate(items_data):
            # raw_item might be {"product_id": 1, "quantity": 2} OR {"product": 1, "quantity": 2}
            product_obj = None
            qty = raw_item.get("quantity", 1)

            # If product is already a Product instance (unlikely here), accept it
            maybe_product = raw_item.get("product")
            if hasattr(maybe_product, "pk"):
                product_obj = maybe_product
            else:
                # try product_id first, then product
                prod_id = raw_item.get("product_id") or raw_item.get("product")
                try:
                    prod_id = int(prod_id)
                except (TypeError, ValueError):
                    item_errors.append({f"items[{idx}]": "product id is invalid or missing."})
                    continue
                try:
                    product_obj = Product.objects.get(pk=prod_id)
                except Product.DoesNotExist:
                    item_errors.append({f"items[{idx}]": f"Product with id {prod_id} does not exist."})
                    continue

            # quantity as int
            try:
                qty = int(qty)
                if qty <= 0:
                    item_errors.append({f"items[{idx}]": "Quantity must be at least 1."})
                    continue
            except (TypeError, ValueError):
                item_errors.append({f"items[{idx}]": "Quantity must be an integer."})
                continue

            # stock check (optional)
            if product_obj.stock is not None and product_obj.stock < qty:
                item_errors.append(
                    {f"items[{idx}]": f"Not enough stock for product '{product_obj.title}' (available {product_obj.stock})."}
                )
                continue

            price_snapshot = product_obj.price
            OrderItem.objects.create(order=order, product=product_obj, quantity=qty, price_snapshot=price_snapshot)
            total += price_snapshot * qty

        if item_errors:
            # rollback order and created items
            order.delete()
            raise serializers.ValidationError({"items": item_errors})

        order.total_price = total
        order.save()
        return order
