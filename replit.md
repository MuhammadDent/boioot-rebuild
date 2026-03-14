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
│   │   └── src/app/
│   │       ├── (public site)/   # الموقع العام
│   │       ├── dashboard/       # لوحة تحكم المستخدم
│   │       └── admin/           # لوحة الإدارة
│   └── backend/src/
│       ├── Boioot.Api
│       │   ├── Controllers/AuthController.cs
│       │   └── Program.cs
│       ├── Boioot.Application
│       │   ├── Exceptions/BoiootException.cs
│       │   └── Features/Auth/
│       │       ├── DTOs/         # RegisterRequest, LoginRequest, AuthResponse, UserProfileResponse
│       │       └── Interfaces/IAuthService.cs
│       ├── Boioot.Domain
│       │   ├── Common/ISoftDeletable.cs
│       │   ├── Entities/         # 12 entities + BaseEntity
│       │   └── Enums/            # 7 enums
│       └── Boioot.Infrastructure
│           ├── Extensions/ServiceCollectionExtensions.cs
│           ├── Features/Auth/AuthService.cs
│           └── Persistence/
│               ├── BoiootDbContext.cs
│               ├── Configurations/   # 11 Fluent API configs
│               ├── Migrations/InitialSchema
│               └── Seeding/DataSeeder.cs
└── docs/
    ├── ui-identity-reference.md
    ├── backend-rules.md
    └── frontend-rules.md
```

---

## حالة المشروع الحالية

- ✅ هيكل المجلدات الكامل
- ✅ Frontend skeleton — RTL Arabic-first، Tailwind، Next.js App Router
- ✅ **Phase 3**: 12 entities + 7 enums + DbContext + 11 EF Core configs + ISoftDeletable interface
- ✅ **Phase 3**: Migration `InitialSchema` مُولَّدة (لم تُطبَّق — تنتظر SQL Server)
- ✅ **Phase 4**: JWT Auth (register / login / me) + BCrypt + role-based authorization
- ✅ **Phase 4**: DataSeeder للـ admin (من appsettings.Development.json)
- ✅ **Phase 4**: Global exception handler بردود JSON عربية

---

## الـ Packages المستخدمة

| الحزمة | المشروع | الغرض |
|---|---|---|
| `Microsoft.EntityFrameworkCore.SqlServer` 8.0.10 | Infrastructure | ORM |
| `BCrypt.Net-Next` 4.0.3 | Infrastructure | تشفير كلمات المرور |
| `System.IdentityModel.Tokens.Jwt` 7.1.2 | Infrastructure | توليد JWT |
| `Microsoft.AspNetCore.Authentication.JwtBearer` 8.0.10 | Api | التحقق من JWT |

---

## إعدادات مهمة

### `appsettings.json` — Jwt section
```json
"Jwt": {
  "Key": "REPLACE_THIS_WITH_A_SECURE_RANDOM_KEY_MIN_32_CHARS",
  "Issuer": "Boioot",
  "Audience": "BoiootClient",
  "ExpiryMinutes": 1440
}
```
⚠️ في الـ production استخدم environment variable `Jwt__Key` بقيمة عشوائية آمنة.

### `appsettings.Development.json` — Admin Seed
```json
"AdminSeed": {
  "Email": "admin@boioot.sy",
  "Password": "Admin@123456",
  "FullName": "مدير النظام"
}
```
⚠️ لا تُرفع قيم الـ production لـ Git. استخدم secrets أو environment variables.

---

## ملاحظات

- `ISoftDeletable` interface: تُطبِّقها User, Company, Property, Project
- `AgentConfiguration` query filter: يفحص `User.IsDeleted` و`Company.IsDeleted` (nullable)
- `PropertyConfiguration` query filter: `!p.IsDeleted && !p.Company.IsDeleted`
- `PasswordHash` → `nvarchar(500)` في DB
- GUID fragmentation: `Guid.NewGuid()` في .NET 8 — يُعالج بـ `Guid.CreateVersion7()` عند الترقية لـ .NET 9
- الـ dashboard ليس تطبيقاً منفصلاً — يعمل داخل نفس Next.js app
