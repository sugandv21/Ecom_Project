# shop/views.py
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from .models import Product, Category, Order
from .serializers import (
    ProductSerializer,
    CategorySerializer,
    OrderSerializer,
    OrderCreateSerializer,
    UserRegistrationSerializer,
)

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class MyTokenView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    
class CurrentUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {"id": user.id, "username": user.username, "email": user.email},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductViewSet(viewsets.ModelViewSet):
    """
    Public product listing. Supports:
      - search (SearchFilter): ?search=term
      - ordering (OrderingFilter): ?ordering=price or ?ordering=-price
      - django-filter lookups on price and category e.g. ?price__gte=10&price__lte=100&category__id=3
    """
    queryset = Product.objects.filter(is_active=True).select_related("category")
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Allow lookup expressions for price (gte/lte/gt/lt) and exact match for category id
    filterset_fields = {
        "price": ["exact", "gte", "lte", "gt", "lt"],
        "category__id": ["exact"],
        "stock": ["exact", "gte", "lte"],
    }

    search_fields = ["title", "subtitle", "description"]
    ordering_fields = ["price", "created", "rating", "title"]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    ordering_fields = ["created_at", "status"]

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            # admin sees all orders
            return Order.objects.all().prefetch_related("items__product")
        # normal users see only their own orders
        return Order.objects.filter(user=user).prefetch_related("items__product")

    # admin-only endpoint to update status (POST payload {"status": "new_status"})
    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def update_status(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)
        status_val = request.data.get("status")
        # ensure valid choice
        valid_choices = dict(Order.STATUS_CHOICES)
        if status_val not in valid_choices:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        order.status = status_val
        order.save(update_fields=["status"])
        return Response({"detail": "Status updated"}, status=status.HTTP_200_OK)
