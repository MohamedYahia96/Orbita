# Orbita — Phase 1 Task Checklist

> **طريقة العمل:** ننفذ مرحلة بمرحلة. كل مهمة تتحول من `[ ]` → `[/]` (جاري) → `[x]` (تم).

---

## Phase 1 — Foundation 🏗️

### 1.1 إنشاء المشروع
- [x] إنشاء مشروع Next.js مع App Router + TypeScript
- [x] تنظيف الملفات الافتراضية
- [x] إعداد هيكل المجلدات (src/app, components, lib, services, hooks, types, utils, stores, i18n)
- [x] إعداد `.env.local` مع المتغيرات الأساسية
- [x] إعداد `tsconfig.json` مع path aliases (@/components, @/lib, etc.)

### 1.2 نظام التصميم (Design System)
- [x] إنشاء `globals.css` مع CSS Variables
  - [x] ألوان Dark Theme (bg, text, accent, status colors)
  - [x] ألوان Light Theme
  - [x] ألوان المنصات (YouTube red, GitHub dark, Telegram blue, etc.)
  - [x] Typography (Inter for EN, Cairo for AR)
  - [x] Spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px)
  - [x] Border radius scale
  - [x] Shadow scale (sm, md, lg, xl)
  - [x] Transition/Animation defaults
  - [x] Z-index scale
  - [x] Breakpoints (mobile, tablet, desktop)
- [x] Google Fonts: تحميل Inter + Cairo
- [x] Glassmorphism utility classes
- [x] Gradient utilities
- [x] RTL support (`[dir="rtl"]` styles)

### 1.3 مكونات UI الأساسية
- [x] `Button` — (primary, secondary, ghost, danger) + sizes (sm, md, lg)
- [x] `Card` — مع glassmorphism + hover effects
- [x] `Input` — text input مع label + error state
- [x] `Modal` — overlay + animation (slide up)
- [x] `Badge` — للعدادات والحالات
- [x] `Avatar` — مع fallback
- [x] `Tooltip` — hover tooltip
- [x] `Skeleton` — loading placeholder
- [x] `EmptyState` — رسالة + أيقونة + CTA button
- [x] `Toast/Notification` — رسائل نجاح/خطأ مؤقتة

### 1.4 Layout الرئيسي
- [x] `Sidebar` — قائمة جانبية
- [x] `Header` — شريط علوي
- [x] `MainContent` — المنطقة الرئيسية
- [x] تجميعهم في `(dashboard)/layout.tsx`

### 1.5 قاعدة البيانات (Prisma + SQLite)
- [x] تثبيت Prisma + @prisma/client
- [x] إنشاء `prisma/schema.prisma`
- [x] إعداد `lib/prisma.ts`
- [x] تشغيل `prisma generate` + `prisma db push`
- [x] Seed data

### 1.6 الصفحات الأساسية (هياكل)
- [x] `(dashboard)/page.tsx` — Overview
- [x] `(dashboard)/feeds/page.tsx` — Feeds
- [x] `(dashboard)/workspaces/page.tsx` — Workspaces
- [x] `(dashboard)/notifications/page.tsx` — Notifications
- [x] `(dashboard)/settings/page.tsx` — Settings
- [x] `not-found.tsx`
- [x] `error.tsx`

### 1.7 i18n (الترجمة)
- [x] تثبيت next-intl
- [x] إعداد ملفات الترجمة
- [x] زر تبديل اللغة يعمل
- [x] RTL يتفعل تلقائياً مع العربية

### 1.8 اختبار المرحلة 1
- [x] `npm run build` — ناجح بدون أخطاء
- [x] التنقل بين كل الصفحات يعمل
- [x] Dark/Light mode يعمل
- [x] تبديل EN/AR يعمل + RTL صحيح
- [x] Sidebar collapse يعمل
- [x] Responsive على Mobile يعمل
- [x] Empty states تظهر بشكل جميل

## Phase 2 — Core ⚙️

### 2.1 قاعدة البيانات (Prisma)
- [x] تحديث `schema.prisma` لإضافة `Workspace`, `Feed`, `FeedItem`, `Tag`, `FeedItemTag`
- [x] تشغيل `prisma db push` و `prisma generate`
- [x] إنشاء API Routes للـ CRUD operations لمساحات العمل والمصادر.

### 2.2 مساحات العمل والمصادر (Workspaces & Feeds)
- [x] واجهة إنشاء / تعديل / حذف مساحات العمل (Workspaces CRUD).
- [x] واجهة إضافة المصادر (Feeds) للـ Workspace.
- [x] دعم إضافة Quick Links (فيسبوك، واتساب، روابط عادية).

### 2.3 عرض محتوى المصادر (Feed Display & FeedCard)
- [x] إنشاء مكون `FeedCard` لعرض المصادر المحفوظة مع Preview.
- [x] كشف تلقائي للروابط (Auto-detect Link Type).
- [x] جلب وعرض Favicons للمواقع تلقائياً.
- [x] تثبيت المصادر المهمة (Pinned Feeds).

### 2.4 أدوات الإنتاجية (Productivity Tools)
- [x] إنشاء ⌨️ Command Palette (`Ctrl/Cmd + K`).
- [x] دعم ⌨️ Keyboard Shortcuts الأساسية للتنقل وإضافة عناصر.
- [x] إنشاء ميزة 📑 Reading List لحفظ العناصر للقراءة لاحقاً (Read Later).
- [x] إنشاء نظام 🏷️ Smart Tags لتصنيف المحتوى وإضافته للعناصر.

## Phase 3 — Content & Notifications 🔔

### 3.1 جلب المحتوى (Content Integration)
- [x] إعداد `RSS Parser` العام للمقالات والمدونات والأخبار.
- [x] تكامل 🔴 YouTube RSS.
- [x] تكامل 🐙 GitHub RSS + Webhooks.
- [x] إعداد Web Scraper باستخدام `Cheerio` للمحتوى المخصص.
- [x] جدولة المهام (Cron Jobs) باستخدام `Vercel Cron` لجلب المحتوى دورياً.

### 3.2 نظام الإشعارات (Notifications)
- [x] إنشاء مكون الإشعارات داخل الداشبورد الداخلي.
- [x] إعداد Push Notifications باستخدام (Service Worker).
- [x] بناء نظام الـ 📬 Smart Digest (التقرير الذكي اليومي / الأسبوعي).

### 3.3 الأدوات المتقدمة والبحث (Advanced Tools)
- [x] إنشاء المخطط الزمني للنشاط 📊 (Activity Timeline).
- [x] إنشاء ميزة البحث الشامل 🔍 (Global Search).
- [x] إضافة ميزة كتابة الملاحظات على المحتوى 📝 (Notes & Annotations).
