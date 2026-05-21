from __future__ import annotations

import logging
import os
from datetime import datetime

import resend

logger = logging.getLogger(__name__)

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = "Randezy <noreply@randezy.com>"


def _send(params: dict) -> None:
    try:
        resend.Emails.send(params)
    except Exception as exc:
        logger.error("Email gönderilemedi: %s", exc)


def send_appointment_created(
    customer_email: str,
    customer_name: str | None,
    business_name: str,
    service_name: str,
    start_time: datetime,
    staff_name: str | None = None,
) -> None:
    date_str = start_time.strftime("%d.%m.%Y %H:%M")
    staff_line = f"<p><b>Personel:</b> {staff_name}</p>" if staff_name else ""
    _send({
        "from": FROM_EMAIL,
        "to": [customer_email],
        "subject": f"Randevunuz Alındı – {business_name}",
        "html": f"""
<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#2563eb">Randevunuz başarıyla oluşturuldu!</h2>
  <p>Merhaba {customer_name or 'Değerli Müşterimiz'},</p>
  <p><b>{business_name}</b> işletmesindeki randevunuz alındı.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
  <p><b>Hizmet:</b> {service_name}</p>
  {staff_line}
  <p><b>Tarih &amp; Saat:</b> {date_str}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
  <p>Randevunuzu yönetmek için <a href="https://randezy.com">randezy.com</a> adresini ziyaret edebilirsiniz.</p>
  <p>İyi günler,<br><b>Randezy Ekibi</b></p>
</div>
""",
    })


def send_appointment_cancelled(
    customer_email: str,
    customer_name: str | None,
    business_name: str,
    service_name: str,
    start_time: datetime,
) -> None:
    date_str = start_time.strftime("%d.%m.%Y %H:%M")
    _send({
        "from": FROM_EMAIL,
        "to": [customer_email],
        "subject": f"Randevunuz İptal Edildi – {business_name}",
        "html": f"""
<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#dc2626">Randevunuz iptal edildi</h2>
  <p>Merhaba {customer_name or 'Değerli Müşterimiz'},</p>
  <p><b>{business_name}</b> işletmesindeki aşağıdaki randevunuz iptal edildi.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
  <p><b>Hizmet:</b> {service_name}</p>
  <p><b>Tarih &amp; Saat:</b> {date_str}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
  <p>Yeni randevu almak için <a href="https://randezy.com">randezy.com</a> adresini ziyaret edebilirsiniz.</p>
  <p>İyi günler,<br><b>Randezy Ekibi</b></p>
</div>
""",
    })
