# Boioot — منصة العقارات السورية

## الوصف
منصة عقارية عربية أولاً، مخصصة للسوق السوري. تجمع بين سوق عقارات عام، لوحة تحكم للمستخدمين، ولوحة إدارة.

---

## التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript) |
| Backend | ASP.NET Core Web API (.NET 8) |
| Database | SQLite + EF Core (EnsureCreated, manual ALTER TABLE for migrations) |
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
- ✅ **Phase 8**: نظام الأدوار المحدّث — 6 أدوار: User, Owner, Broker, Agent, CompanyOwner, Admin
- ✅ **Phase 8**: Broker (مكتب عقاري) — ينشئ وكلاء تحته، يرى إعلاناته + إعلانات وكلائه
- ✅ **Phase 8**: Owner (مالك عقار) — حد 2 إعلان/شهر كالـ User، توثيق اختياري لاحقاً
- ✅ **Phase 8**: Agent — يُنشأ فقط من Broker أو CompanyOwner (لا تسجيل مستقل)
- ✅ **Phase 8**: AgentManagement API — POST /api/agents، GET /api/agents/my-agents، PATCH toggle-active
- ✅ **Phase 8**: Agents.BrokerId — عمود جديد يربط الوكيل بالمكتب (أو CompanyId بالشركة)
- ✅ **Phase 8**: صفحة /dashboard/agents — إدارة الوكلاء للمكتب والشركة
- ✅ **Phase 9 (A)**: هيكل الاشتراكات — Plans, Accounts, AccountUsers, Subscriptions (جداول جديدة)
- ✅ **Phase 9 (A)**: AccountId? أُضيف لـ Users و Companies (أعمدة nullable)
- ✅ **Phase 9 (A)**: 4 خطط مبدئية مُبذورة: Free(2), Silver(5), Gold(20), Platinum(∞)
- ✅ **Phase 9 (B)**: PlanPricings — جدول التسعير المنفصل (Monthly/Yearly) + 9 باقات كاملة محبوسة (ef000001-ef000011)
- ✅ **Phase 9 (B)**: صفحة التسعير العامة `/pricing` — BillingToggle، بطاقات الباقات بقسمين (أفراد + محترفين)
- ✅ **Phase 9 (C)**: Plan.Rank — ترتيب ترقي الباقات (أفراد 0-3، محترفون 10-14)
- ✅ **Phase 9 (C)**: Subscription.PricingId — يربط الاشتراك بصف التسعير المختار
- ✅ **Phase 9 (C)**: GET /api/dashboard/subscription/current — حالة الاشتراك الحالي (أو Free افتراضياً)
- ✅ **Phase 9 (C)**: POST /api/dashboard/subscription/upgrade-intent — تقييم نية الترقية/التخفيض (بدون دفع)
- ✅ **Phase 9 (C)**: UpgradeModal — نافذة تأكيد الترقية مع "الدفع قريباً 🔒"
- ✅ **Phase 9 (C)**: PricingCard — أزرار ذكية: الباقة الحالية / ترقية ↑ / تخفيض ↓ / تغيير دورة الفوترة
- ✅ **Phase 9 (D)**: InvoiceStatus enum — Pending, Paid, Failed, Cancelled
- ✅ **Phase 9 (D)**: Invoice entity — UserId, PlanPricingId, Amount, Currency, Status, ProviderName, ExternalRef
- ✅ **Phase 9 (D)**: PaymentProof entity — InvoiceId (1:1), ImageUrl, Notes
- ✅ **Phase 9 (D)**: IBillingProvider interface — ProviderName, CreatePaymentAsync, ConfirmPaymentAsync, RejectPaymentAsync (Stripe-ready design)
- ✅ **Phase 9 (D)**: IBillingService interface — CreateCheckoutAsync, GetUserInvoicesAsync, SubmitPaymentProofAsync, GetAdminInvoicesAsync, AdminConfirmPaymentAsync, AdminRejectPaymentAsync
- ✅ **Phase 9 (D)**: InternalBillingProvider — بنك تحويل يدوي، بدون API خارجي
- ✅ **Phase 9 (D)**: BillingService — ينسق بين المزود + تخزين الفاتورة + تفعيل الاشتراك عند التأكيد
- ✅ **Phase 9 (D)**: POST /api/dashboard/billing/checkout — يُنشئ فاتورة معلقة ويعيد تفاصيلها
- ✅ **Phase 9 (D)**: GET /api/dashboard/billing/invoices — فواتير المستخدم
- ✅ **Phase 9 (D)**: POST /api/dashboard/billing/invoices/{id}/proof — رفع إيصال الدفع
- ✅ **Phase 9 (D)**: GET /api/admin/billing/invoices?status= — قائمة الفواتير للأدمن
- ✅ **Phase 9 (D)**: POST /api/admin/billing/invoices/{id}/confirm — تأكيد الدفع + تفعيل الاشتراك تلقائياً
- ✅ **Phase 9 (D)**: POST /api/admin/billing/invoices/{id}/reject — رفض الدفع
- ✅ **Phase 9 (D)**: UpgradeModal — يستدعي /checkout عند التأكيد ويعرض تفاصيل الفاتورة وتعليمات التحويل البنكي
- ✅ **Phase 9 (D)**: features/billing/types.ts + api.ts — أنواع وطرق API للفواتير في الواجهة الأمامية

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

## Blog Module — Backend Foundation (مكتمل)

**الملفات المُضافة:**

Domain:
- `Boioot.Domain/Enums/BlogPostStatus.cs` — Draft | Published | Scheduled | Archived
- `Boioot.Domain/Entities/BlogCategory.cs` — Id, Name, Slug, Description, IsActive, DisplayOrder
- `Boioot.Domain/Entities/BlogPost.cs` — كامل الحقول (AuthorId→User, CategoryId→BlogCategory)

Application:
- `Features/Blog/DTOs/BlogCategoryResponse.cs`
- `Features/Blog/DTOs/BlogPostSummaryResponse.cs`
- `Features/Blog/DTOs/BlogPostDetailResponse.cs`
- `Features/Blog/DTOs/CreateBlogPostRequest.cs`
- `Features/Blog/DTOs/UpdateBlogPostRequest.cs`
- `Features/Blog/DTOs/CreateBlogCategoryRequest.cs`
- `Features/Blog/DTOs/UpdateBlogCategoryRequest.cs`
- `Features/Blog/Interfaces/IBlogService.cs`

Infrastructure:
- `Persistence/Configurations/BlogCategoryConfiguration.cs` — unique index on Slug
- `Persistence/Configurations/BlogPostConfiguration.cs` — FK→User (Restrict), FK→BlogCategory (Restrict), unique index on Slug, enum stored as string
- `Features/Blog/BlogService.cs` — تنفيذ كامل لـ IBlogService

API Controllers:
- `Controllers/AdminBlogController.cs` — [AdminOnly] — 11 endpoint
- `Controllers/PublicBlogController.cs` — [AllowAnonymous] — 4 endpoints

**الملفات المُعدَّلة:**
- `BoiootDbContext.cs` — أُضيف DbSet<BlogCategory> + DbSet<BlogPost>
- `ServiceCollectionExtensions.cs` — تسجيل IBlogService → BlogService
- `Program.cs` — CREATE TABLE IF NOT EXISTS BlogCategories + BlogPosts + unique indexes

**Endpoints:**

Admin (POST /api/admin/blog/…):
| Method | Path | Description |
|---|---|---|
| GET | /api/admin/blog/posts | list all posts (filter: status?, categoryId?) |
| GET | /api/admin/blog/posts/{id} | get post with full content |
| POST | /api/admin/blog/posts | create draft |
| PUT | /api/admin/blog/posts/{id} | update fields |
| DELETE | /api/admin/blog/posts/{id} | delete permanently |
| POST | /api/admin/blog/posts/{id}/publish | Draft/Scheduled → Published |
| POST | /api/admin/blog/posts/{id}/unpublish | → Draft |
| POST | /api/admin/blog/posts/{id}/archive | → Archived |
| GET | /api/admin/blog/categories | all categories + post counts |
| GET | /api/admin/blog/categories/{id} | single category |
| POST | /api/admin/blog/categories | create |
| PUT | /api/admin/blog/categories/{id} | update |
| DELETE | /api/admin/blog/categories/{id} | delete (fails if posts exist) |

Public (/api/blog/…):
| Method | Path | Query Params |
|---|---|---|
| GET | /api/blog/posts | categorySlug?, search?, page, pageSize |
| GET | /api/blog/posts/{slug} | — |
| GET | /api/blog/categories | — |
| GET | /api/blog/categories/{categorySlug}/posts | page, pageSize |

**لم يُبنَ بعد (V2):** admin UI، صفحات blog العامة، تعليقات، وسوم، سجل تعديلات

## Stripe Billing Integration (مكتمل)

**الملفات المُضافة (backend):**
- `Boioot.Application/Features/Billing/Settings/StripeOptions.cs` — إعدادات Stripe (SecretKey, WebhookSecret, SuccessUrl, CancelUrl)
- `Boioot.Infrastructure/Features/Billing/StripeBillingProvider.cs` — منفذ IBillingProvider لـ Stripe (ينشئ Checkout Session + يحفظ Invoice)
- `Boioot.Api/Controllers/StripeWebhookController.cs` — POST /api/webhooks/stripe (يتحقق من التوقيع، يعالج checkout.session.completed)

**الملفات المُعدَّلة (backend):**
- `IBillingService.cs` — أُضيف `StripeWebhookConfirmAsync(sessionId)` — idempotent
- `BillingService.cs` — تحول من `IBillingProvider` الواحد إلى `IEnumerable<IBillingProvider>` + `PickProvider(name)` + منطق اختيار Provider حسب BillingMode
- `ServiceCollectionExtensions.cs` — تسجيل StripeBillingProvider كـ IBillingProvider إضافي (كلا المزوّدَين يعملان معاً)
- `CheckoutRequest.cs` — أُضيف `Provider?` (اختياري: "stripe" أو "internal")
- `InvoiceResponse.cs` — أُضيف `SessionUrl?` (URL الـ Stripe Checkout لإعادة توجيه المستخدم)
- `Invoice.cs` (entity) — أُضيف `StripeSessionUrl` (مخزَّن في DB للرجوع إليه)
- `Program.cs` — ربط StripeOptions + ALTER TABLE Invoices ADD COLUMN StripeSessionUrl
- `appsettings.json` — أُضيف قسم "Stripe" (فارغ افتراضياً، يُملأ عبر Secrets)

**منطق اختيار المزود:**
| BillingMode | النتيجة |
|---|---|
| InternalOnly | دائماً InternalBillingProvider (تحويل بنكي) |
| StripeOnly | دائماً StripeBillingProvider |
| Hybrid | حسب request.Provider (الافتراضي: stripe) |

**تدفق Stripe:**
1. POST /api/dashboard/billing/checkout `{"pricingId":"...","provider":"stripe"}`
2. StripeBillingProvider ينشئ Checkout Session على Stripe API → يحفظ Invoice (StripeSessionUrl, ExternalRef=sessionId)
3. InvoiceResponse يحمل `sessionUrl` — الـ frontend يعيد توجيه المستخدم إليه
4. المستخدم يكمل الدفع على Stripe
5. Stripe يُرسل webhook → POST /api/webhooks/stripe
6. StripeWebhookController يتحقق من التوقيع → `StripeWebhookConfirmAsync(sessionId)`
7. BillingService يجد الـ Invoice بـ ExternalRef → AdminConfirmPaymentAsync (adminId=Guid.Empty) → الاشتراك يُفعَّل

**الضوامن:**
- InternalBillingProvider لم يُعدَّل أبداً — المسار القديم يعمل بدون تغيير
- StripeWebhookConfirmAsync idempotent — الـ webhook يمكن إعادة إرساله بأمان
- إذا لم يُضبط WebhookSecret: الـ endpoint يقبل ويُحذِّر في اللوج (لا يرفض)
- إذا لم يُضبط SecretKey: CreatePaymentAsync يُعيد 503 "استخدم التحويل البنكي"

**الإعدادات المطلوبة لتفعيل Stripe:**
```json
// appsettings.json أو Environment Variables
"Stripe": {
  "SecretKey": "sk_live_...",
  "WebhookSecret": "whsec_...",
  "SuccessUrl": "https://your-domain.com/dashboard/billing?status=success&provider=stripe",
  "CancelUrl": "https://your-domain.com/pricing?status=cancelled"
}
```

## Admin Panel Module (مكتمل)
**الملفات المُضافة:**
- `features/admin/constants.ts` — ADMIN_PAGE_SIZE(20), ROLE_LABELS/BADGE, PROPERTY_STATUS_BADGE, ADMIN_PROJECT_STATUS_BADGE
- `features/admin/api.ts` — adminApi: getUsers/getCompanies/getProperties/getProjects/getRequests/updateUserStatus/verifyCompany
- `app/dashboard/admin/users/page.tsx` — قائمة المستخدمين مع فلترة (role, isActive) وتبديل الحالة (Admin فقط)
- `app/dashboard/admin/companies/page.tsx` — قائمة الشركات مع فلترة (city, isVerified) وتبديل التوثيق (Admin فقط)
- `app/dashboard/admin/properties/page.tsx` — عرض كل العقارات مع فلترة (status, city) — قراءة فقط
- `app/dashboard/admin/projects/page.tsx` — عرض كل المشاريع مع فلترة (status, city) — قراءة فقط
- `app/dashboard/admin/requests/page.tsx` — عرض كل الطلبات مع فلترة (status) — قراءة فقط

**الملفات المُعدَّلة:**
- `types/index.ts` — أُضيف: AdminUserResponse, AdminCompanyResponse
- `app/dashboard/page.tsx` — أُضيف قسم "إدارة النظام" بـ 5 NavCards للـ Admin فقط

**الإجراءات المدعومة:**
- Users: toggle isActive (تفعيل/تعطيل) — المدير لا يستطيع تعطيل حسابه الخاص (isSelf check)
- Companies: toggle isVerified (توثيق/إلغاء توثيق)
- Properties/Projects/Requests: قراءة فقط (لا يوجد endpoint تعديل في الـ backend)

**نمط الفلترة:**
- `appliedFiltersRef` يخزن آخر params مُطبَّقة لإعادة استخدامها في paginator
- `actionLoading: string | null` يتتبع أيّ عنصر يُعالج حالياً
