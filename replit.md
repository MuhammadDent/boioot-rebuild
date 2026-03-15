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
- ✅ **Phase 5**: Properties module — public list/detail + CRUD + dashboard + pagination + filtering
- ✅ **Phase 5**: Authorization policies: AdminOrCompanyOwner، AdminOrCompanyOwnerOrAgent
- ✅ **Phase 5**: PagedResult<T> generic wrapper في Application/Common/Models
- ✅ **Phase 5**: BaseController مشترك لاستخراج JWT claims
- ✅ **Phase 6**: Projects module — public list/detail + CRUD + dashboard + IsPublished flag
- ✅ **Phase 6**: Project entity ممدودة: StartingPrice, DeliveryDate, Lat/Lon, IsPublished
- ✅ **Phase 6**: Migration AddProjectExtendedFields — 5 حقول + 3 indexes
- ✅ **Phase 6**: Authorization: Admin أو CompanyOwner فقط (لا Agent في المشاريع)
- ✅ **Phase 7**: Requests/Leads module — anonymous lead capture + dashboard management
- ✅ **Phase 7**: Request entity بدون UserId — يحمل Name, Phone, Email, Message
- ✅ **Phase 7**: RequestStatus → New, Contacted, Qualified, Closed
- ✅ **Phase 7**: Dashboard: Admin كل الطلبات | CompanyOwner طلبات شركته | Agent طلبات عقاراته
- ✅ **Phase 7**: Migration AddRequestLeadFields — حذف UserId FK + إضافة Name/Phone/Email

---

## بنية التشغيل (Replit Workflows)

| الـ Workflow | الأمر | المنفذ |
|---|---|---|
| `Boioot Frontend` | `cd boioot/apps/frontend && npm run dev -- -p 3000` | port 3000 (webview) |
| `Boioot .NET API` | `bash boioot/apps/backend/run-api.sh` | port 5233 (console) |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | port 8080 → proxy to :5233 |

**Routing:**
- المتصفح → `localhost:3000` (Next.js frontend)
- المتصفح → `/api/*` → Replit proxy → api-server (:8080) → .NET backend (:5233)
- الـ Next.js `next.config.ts` له rewrite لـ `/api/*` → `:5233` (للـ SSR فقط)

⚠️ بدون SQL Server متاح في Replit، ستفشل جميع عمليات قاعدة البيانات. الـ frontend يعمل، الـ backend يعمل، لكن API calls تعيد خطأ DB.

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

## Dashboard Properties Module (مكتمل)
**الملفات المُضافة:**
- `features/dashboard/properties/api.ts` — dashboardPropertiesApi: getList, create, update, delete
- `components/dashboard/properties/PropertyForm.tsx` — نموذج مشترك (create/edit) مع validation كامل
- `app/dashboard/properties/page.tsx` — قائمة العقارات مع حذف آمن بـ window.confirm
- `app/dashboard/properties/new/page.tsx` — صفحة الإضافة (Admin/CompanyOwner فقط)
- `app/dashboard/properties/[id]/edit/page.tsx` — صفحة التعديل (Admin/CompanyOwner/Agent)

**الملفات المُعدَّلة:**
- `types/index.ts` — أُضيف: DashboardPropertyItem, CreatePropertyRequest, UpdatePropertyRequest
- `app/dashboard/page.tsx` — استُبدل placeholder بكارت تنقل "إدارة العقارات"

**ملاحظات:**
- Edit pre-fill: يُستخدم `GET /api/dashboard/properties/{id}` (dashboard endpoint) — يدعم جميع الحالات بما فيها Inactive
- CompanyId: حقل نصي UUID يظهر في Create فقط (لا يوجد endpoint لجلب companyId المستخدم)
- Status field: يظهر في Edit فقط (Create يضع Available تلقائياً من الـ backend)
- الصلاحيات: Admin/CompanyOwner = CRUD كامل | Agent = list + edit فقط

## Dashboard Projects Module (مكتمل)
**الملفات المُضافة:**
- `features/dashboard/projects/api.ts` — dashboardProjectsApi: getList, getById, create, update, delete
- `components/dashboard/projects/ProjectForm.tsx` — نموذج مشترك (create/edit) مع validation كامل
- `app/dashboard/projects/page.tsx` — قائمة المشاريع مع حذف آمن
- `app/dashboard/projects/new/page.tsx` — صفحة الإضافة (Admin/CompanyOwner فقط)
- `app/dashboard/projects/[id]/edit/page.tsx` — صفحة التعديل (Admin/CompanyOwner فقط)

**الملفات المُعدَّلة:**
- `types/index.ts` — أُضيف: DashboardProjectItem, CreateProjectRequest, UpdateProjectRequest
- `app/dashboard/page.tsx` — أُضيفت بطاقة "إدارة المشاريع" + إعادة هيكلة NavCard كمكوّن مشترك
- `IProjectService.cs` — أُضيف GetByIdDashboardAsync
- `ProjectService.cs` — تُنفَّذ GetByIdDashboardAsync (بدون فلتر IsPublished + التحقق من الصلاحية)
- `DashboardController.cs` — أُضيف IProjectService injection + GET /api/dashboard/projects/{id:guid}

**الفروق الجوهرية عن وحدة العقارات:**
- `status` يظهر في Create و Edit معاً (في العقارات: Edit فقط)
- `isPublished` checkbox بدلاً من status enum
- لا `listingType` ولا `area` ولا `bedrooms/bathrooms`
- حقول جديدة: `startingPrice` (اختياري)، `deliveryDate` (تاريخ اختياري)
- الصلاحيات: Admin/CompanyOwner فقط لـ CRUD (Agent = قائمة للعرض فقط، لا تعديل)

## Public Requests / Leads Flow (مكتمل)
**الملفات المُضافة:**
- `features/requests/api.ts` — `requestsApi.submit(data)` → `POST /requests` (عام، لا يحتاج auth)
- `components/ui/InquiryForm.tsx` — مكوّن مشترك: اسم، هاتف، بريد (اختياري)، رسالة (اختياري)، success state

**الملفات المُعدَّلة:**
- `types/index.ts` — أُضيف: `SubmitRequestPayload`, `RequestResponse`
- `app/(public site)/properties/[id]/page.tsx` — أُضيف `<InquiryForm propertyId={property.id} contextTitle={property.title} />`
- `app/(public site)/projects/[id]/page.tsx` — أُضيف `<InquiryForm projectId={project.id} contextTitle={project.title} />`

**Payload المُرسَل للـ backend:**
```json
{ "name": "...", "phone": "...", "email?": "...", "message?": "...", "propertyId?": "uuid", "projectId?": "uuid" }
```
**Validation (يطابق backend بدقة):**
- name: required, 2-200 حرف
- phone: required, 5-50 حرف  
- email: اختياري، regex صحيح، max 200
- message: اختياري، max 2000

**Behavior:**
- نجاح → يُستبدل النموذج برسالة شكر (لا redirect — المستخدم يبقى في الصفحة)
- خطأ → `normalizeError()` يُعرض فوق النموذج
- الـ endpoint: `POST /api/requests` عام (لا يتطلب تسجيل دخول)
