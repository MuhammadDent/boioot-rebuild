# Boioot — منصة العقارات السورية

## الوصف
منصة عقارية عربية أولاً، مخصصة للسوق السوري. تجمع بين سوق عقارات عام، لوحة تحكم للمستخدمين، ولوحة إدارة.

---

## التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript) |
| Backend | ASP.NET Core Web API (.NET 8) |
| Database | SQL Server + EF Core |
| Architecture | Modular Monolith |
| UI Direction | RTL، عربي أولاً، أخضر `#2E7D32` |

---

## هيكل المشروع

```
boioot/
├── apps/
│   ├── frontend/               # Next.js — تطبيق واحد يضم الأقسام الثلاثة
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (public site)/   # الموقع العام: /, /properties, /projects...
│   │       │   ├── dashboard/       # لوحة تحكم المستخدم
│   │       │   └── admin/           # لوحة الإدارة
│   │       ├── components/
│   │       │   ├── layout/          # Header, Footer (للموقع العام)
│   │       │   └── dashboard/       # DashboardHeader, DashboardSidebar
│   │       ├── features/            # فارغ — جاهز
│   │       ├── lib/                 # فارغ — جاهز
│   │       ├── styles/theme.css     # متغيرات الألوان والخطوط
│   │       └── types/               # فارغ — جاهز
│   └── backend/                # ASP.NET Core
│       └── src/
│           ├── Boioot.Api          # Controllers, Program.cs, /health endpoint
│           ├── Boioot.Application  # Use Cases, Interfaces (فارغ)
│           ├── Boioot.Domain       # Entities, Rules (فارغ)
│           └── Boioot.Infrastructure # DB, EF Core (فارغ)
└── docs/
    ├── project-setup-plan.md
    ├── ui-identity-reference.md    # الهوية البصرية
    ├── backend-rules.md            # قواعد البناء الخلفي
    └── frontend-rules.md           # قواعد البناء الأمامي
```

---

## حالة المشروع الحالية

- ✅ هيكل المجلدات الكامل
- ✅ Backend يُبنى بنجاح — `/health` endpoint فقط
- ✅ Frontend skeleton — صفحات placeholder لجميع الأقسام
- ✅ RTL + Arabic-first مُعدّ في root layout
- ✅ Theme variables (الأخضر، الخطوط، الـ spacing)
- ✅ وثائق المشروع (ui-identity، backend-rules، frontend-rules)
- ⬜ لا business logic بعد
- ⬜ لا قاعدة بيانات بعد
- ⬜ لا authentication بعد

---

## ملاحظات

- `attached_assets/` يحتوي على شعار المنصة (badge سداسي، خلفية شفافة)
- `artifacts/` بنية تحتية خاصة بـ Replit — لا تُعدَّل
- الـ dashboard ليس تطبيقاً منفصلاً — يعمل داخل نفس Next.js app
