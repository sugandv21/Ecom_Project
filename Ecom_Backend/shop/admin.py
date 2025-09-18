from django.contrib import admin
from .models import Category, Product, Order, OrderItem

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    prepopulated_fields = {"slug": ("name",)}

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "category", "price", "stock", "is_active", "created")
    list_filter = ("is_active", "category")
    search_fields = ("title", "description")

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    readonly_fields = ("product", "quantity", "price_snapshot")
    can_delete = False
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total_price", "created_at")
    list_filter = ("status",)
    inlines = [OrderItemInline]
