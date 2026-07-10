# نشر Nexus AI VoiceOps على Render وربطه بدومين

هذا المشروع مجهز كـ Node Web Service واحد:

- الباكند يعمل على المنفذ الذي تعطيه منصة الاستضافة.
- الواجهة تعمل داخلياً ويتم عرضها من نفس الرابط العام.
- كل طلبات `/api` تذهب لنفس السيرفر.

## 1. ارفع المشروع على GitHub

من داخل فولدر المشروع:

```bat
git add .
git commit -m "Prepare Nexus AI VoiceOps for deployment"
git branch -M main
git remote set-url origin https://github.com/zayedAahmad/nexus-ai-voiceops.git
git push -u origin main
```

إذا كان `origin` غير موجود:

```bat
git remote add origin https://github.com/zayedAahmad/nexus-ai-voiceops.git
```

## 2. اعمل Web Service على Render

1. افتح Render Dashboard.
2. اختر `New`.
3. اختر `Web Service`.
4. اربط GitHub واختر repo:

```text
nexus-ai-voiceops
```

## 3. إعدادات Render

استخدم هذه القيم:

```text
Runtime: Node
Build Command: npm run build
Start Command: npm start
Health Check Path: /api/health
```

Environment Variables:

```text
NODE_VERSION=22.20.0
NEXUS_SINGLE_URL=true
```

إذا أردت استخدام OpenAI لاحقاً:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.5
```

لا تضع مفاتيح API داخل GitHub.

## 4. الرابط المؤقت

بعد انتهاء النشر، Render يعطيك رابط مثل:

```text
https://nexus-ai-voiceops.onrender.com
```

افتح:

```text
https://nexus-ai-voiceops.onrender.com/login
```

## 5. ربط الدومين

بعد شراء الدومين:

1. افتح خدمة المشروع في Render.
2. ادخل على `Settings`.
3. افتح `Custom Domains`.
4. أضف الدومين مثل:

```text
nexusvoiceops.com
```

أو:

```text
www.nexusvoiceops.com
```

5. Render سيعطيك DNS records.
6. انسخ الـ DNS records إلى الشركة التي اشتريت منها الدومين.
7. انتظر حتى يظهر SSL/HTTPS.

## ملاحظة مهمة

Render free plan ممكن يدخل في وضع sleep إذا لم يستخدمه أحد لفترة. لأول زيارة بعد النوم قد يأخذ الموقع وقتاً قصيراً حتى يفتح.
