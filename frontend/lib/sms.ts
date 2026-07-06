// Netgsm SMS gönderim helper'ı. Bildirimler booking'i asla düşürmez —
// çağıran taraf hatayı yutmalı (try/catch), bu fonksiyon throw etmez.

const NETGSM_ENDPOINT = "https://api.netgsm.com.tr/sms/rest/v2/send";

function toNetgsmPhone(e164: string): string | null {
  // "+905321234567" -> "5321234567" (Netgsm TR numaralarını başında 0/90 olmadan bekler)
  const digits = String(e164 ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return digits.slice(2);
  if (digits.length === 10 && digits[0] === "5") return digits;
  return null;
}

export async function sendSms(phone: string, message: string): Promise<boolean> {
  const usercode = process.env.NETGSM_USERCODE;
  const password = process.env.NETGSM_PASSWORD;
  const header = process.env.NETGSM_HEADER;
  if (!usercode || !password || !header) {
    console.log("[sms] Netgsm env eksik, gönderim atlandı");
    return false;
  }

  const no = toNetgsmPhone(phone);
  if (!no) {
    console.error("[sms] geçersiz telefon formatı:", phone);
    return false;
  }

  try {
    const auth = Buffer.from(`${usercode}:${password}`).toString("base64");
    const res = await fetch(NETGSM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        msgheader: header,
        encoding: "TR",
        messages: [{ msg: message.slice(0, 459), no }],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.code !== "00") {
      console.error("[sms] Netgsm gönderim başarısız:", res.status, data);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[sms] Netgsm istek hatası:", e);
    return false;
  }
}
