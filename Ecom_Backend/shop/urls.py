# shop/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CategoryViewSet, OrderViewSet, RegisterAPIView, MyTokenView, CurrentUserAPIView
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("categories", CategoryViewSet, basename="category")
router.register("orders", OrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/register/", RegisterAPIView.as_view(), name="auth-register"),
     path("auth/me/", CurrentUserAPIView.as_view(), name="auth-me"), 
    path("auth/token/", MyTokenView.as_view(), name="token_obtain_pair"),   
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
