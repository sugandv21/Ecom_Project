from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from decimal import Decimal
from .models import Order

User = get_user_model()

@receiver(post_save, sender=User)
def send_welcome_email(sender, instance, created, **kwargs):
    if created and instance.email:
        subject = "Welcome to Our Shop"
        message = f"Hi {instance.username},\n\nThanks for registering."
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [instance.email],
            fail_silently=False,
        )


@receiver(post_save, sender=Order)
def send_order_confirmation(sender, instance, created, **kwargs):
    if created and instance.user.email:
        # Make sure total_price is never negative and always 2 decimal places
        total = instance.total_price or Decimal("0.00")
        if total < 0:
            total = Decimal("0.00")
        formatted_total = f"{total:.2f}"

        subject = f"Order #{instance.id} placed successfully"
        message = (
            f"Hi {instance.user.username},\n\n"
            f"Your order #{instance.id} has been placed successfully.\n"
            f"Total: ${formatted_total}\n"
            f"Status: {instance.status}."
        )
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [instance.user.email],
            fail_silently=False,
        )
