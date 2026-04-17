# 📋 Orbita — المهام التي تتطلب تدخلاً يدوياً

> هذا الملف يسرد جميع الخطوات التي لا يمكن تنفيذها تلقائياً، وتتطلب منك القيام بها شخصياً.
> رتّبها حسب الأولوية: **🔴 ضروري** | **🟡 مهم** | **🟢 اختياري**

---

## 🔴 ضروري قبل النشر (Deployment)

### 1. إعداد متغيرات Vercel البيئية

عند نشر المشروع على Vercel، يجب إضافة هذه المتغيرات يدوياً من لوحة تحكم Vercel:
**Settings → Environment Variables**

```
DATABASE_URL          = file:./dev.db  (ملاحظة: استبدل بـ Turso أو PostgreSQL للإنتاج)
NEXT_PUBLIC_APP_URL   = https://your-domain.vercel.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY = BPjzDI7qAH68M-u5OePn2AnmTeWOmfHu1bGpqrKRRYQ7lq0uZOQt9CF6DS1nx5churhUDK9hbUP_NJ0lMateZ2A
VAPID_PRIVATE_KEY     = LhDieM6ziywZHvubqQCBoZCb9K0hbPD2sCiA7Nw2czs
CRON_SECRET           = (أنشئ سلسلة عشوائية طويلة لحماية Cron endpoint)
```

> ⚠️ **تنبيه:** لا تشارك `VAPID_PRIVATE_KEY` أو `CRON_SECRET` مع أي أحد ولا ترفعهما على GitHub.

---

### 2. إعداد قاعدة البيانات للإنتاج

المشروع حالياً يستخدم **SQLite** (ملف محلي فقط) وهو لا يعمل على Vercel.
يجب الترقية إلى قاعدة بيانات سحابية:

**الخيار الموصى به — Turso (مجاني + متوافق مع SQLite):**
1. اذهب إلى [turso.tech](https://turso.tech) وأنشئ حساباً
2. شغّل الأمر: `turso db create orbita`
3. احصل على الـ URL والـ Token:
   ```bash
   turso db show orbita --url
   turso db tokens create orbita
   ```
4. غيّر `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("TURSO_DATABASE_URL")
     extensions = []
   }
   ```
   أو انتقل إلى `provider = "postgresql"` مع Supabase/Neon.
5. أضف في Vercel:
   ```
   TURSO_DATABASE_URL = libsql://your-db.turso.io
   TURSO_AUTH_TOKEN   = your-token
   ```
6. شغّل: `npx prisma db push` بعد التغيير.

---

### 3. تفعيل Vercel Cron Jobs

الـ Cron مُعرَّف في `vercel.json` ليعمل كل ساعة تلقائياً على Vercel.
لكن يجب:
1. التأكد من وجود `CRON_SECRET` في متغيرات Vercel.
2. التحقق من أن الـ Cron يعمل من لوحة: **Vercel Dashboard → Project → Cron Jobs**.

---

## 🟡 مهم للإنتاج

### 4. إعداد GitHub Webhook

لتلقي أحداث GitHub (push, release) تلقائياً في التطبيق:
1. اذهب إلى أي **Repository → Settings → Webhooks → Add webhook**
2. Payload URL: `https://your-domain.vercel.app/api/webhooks/github`
3. Content type: `application/json`
4. Events: اختر **"Pushes"** و **"Releases"**
5. (اختياري للأمان) أضف Secret وعدّل `api/webhooks/github/route.ts` للتحقق منه.

---

### 5. إنشاء مستخدم أول في قاعدة البيانات

التطبيق حالياً يُرجع أول مستخدم من DB بدون نظام تسجيل دخول.
يجب إنشاء مستخدمك يدوياً عبر seed script أو مباشرةً:

```bash
# شغّل الـ seed script الموجود
npx prisma db seed
```

أو من Prisma Studio:
```bash
npx prisma studio
```
ثم أضف موديل `User` بـ email وname.

---

### 6. تحديث بيانات الاتصال في push-sender

في ملف `src/services/push-sender.ts` السطر 6، يوجد:
```js
'mailto:kontakt@orbita.com'
```
**غيّره لبريدك الإلكتروني الحقيقي:**
```js
'mailto:your-email@example.com'
```

---

## 🟢 اختياري / تحسينات مستقبلية

### 7. إعداد نظام المصادقة (Authentication)

حالياً لا يوجد نظام تسجيل دخول — التطبيق يعمل لمستخدم واحد.
إذا أردت إضافة تعدد المستخدمين:
- استخدم **NextAuth.js** أو **Clerk** أو **Supabase Auth**
- عدّل جميع API Routes من `prisma.user.findFirst()` إلى session-based queries.

---

### 8. تغيير جدول Cron (اختياري)

الجدول الحالي في `vercel.json`:
```json
"schedule": "0 * * * *"  // كل ساعة
```
يمكنك تغييره حسب احتياجك:
- `*/30 * * * *` → كل 30 دقيقة
- `0 */6 * * *` → كل 6 ساعات
- `0 8 * * *`   → مرة يومياً الساعة 8 صباحاً

---

### 9. إضافة favicon مخصص

حالياً Push Notifications تستخدم `/favicon.ico` الافتراضي.
لتخصيصه: ضع صورة `favicon.ico` أو `icon.png` في مجلد `public/`.

---

### 10. ضبط اسم التطبيق في إشعارات Push

في ملف `src/services/push-sender.ts`:
```js
title: `New in ${feedTitle}`,  // اسم المصدر فقط
```
يمكنك تخصيص نص الإشعار حسب رغبتك.

---

## 📝 ملاحظات مهمة

| الأمر | متى تشغله |
|-------|-----------|
| `npx prisma db push` | بعد أي تغيير لـ schema.prisma |
| `npx prisma generate` | بعد `db push` لتحديث Client |
| `npx prisma studio` | لعرض وتعديل البيانات بواجهة رسومية |
| `npx prisma db seed` | لإضافة بيانات أولية (مستخدم، workspaces تجريبية) |
| `npm run build` | قبل النشر للتأكد من غياب الأخطاء |

---

*آخر تحديث: المرحلة الثالثة — Phase 3*
