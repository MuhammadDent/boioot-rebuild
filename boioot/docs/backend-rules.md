# Boioot Backend — القواعد الهندسية

## المعمارية العامة

- **Modular Monolith**: تطبيق واحد مقسّم داخلياً إلى وحدات (modules) منعزلة.
- لا microservices مبكراً — التقسيم يأتي بعد ثبات النطاق، ليس قبله.
- كل module يملك حدوده الخاصة ولا يخترق حدود module آخر مباشرة.

---

## طبقات المشروع

```
Boioot.Domain         ← الكيانات والقيم والقواعد الأساسية (لا dependencies خارجية)
Boioot.Application    ← Use Cases، Commands، Queries، Interfaces
Boioot.Infrastructure ← قاعدة البيانات، خدمات خارجية، EF Core
Boioot.Api            ← Controllers، Middleware، DI Configuration
```

- الاعتماد يسير في اتجاه واحد فقط: Api → Application → Domain
- Infrastructure تعتمد على Application (لتنفيذ interfaces)، لا العكس.

---

## تنظيم الكود داخل كل Layer

- التسمية تعكس النطاق: `Properties`, `Projects`, `Users`, `Reviews`...
- كل feature له مجلده الخاص داخل الطبقة المناسبة
- لا god-classes ولا files بمئات الأسطر

---

## قواعد صارمة

- **لا business logic في Controllers** — Controllers تستقبل وترسل فقط
- **لا direct DB access من Api** — كل شيء عبر Application layer
- **لا Repositories فارغة بلا حاجة** — أضف pattern حين يكون له مبرر واضح
- **لا static classes للـ helpers** — استخدم services قابلة للـ injection
- **لا premature abstraction** — لا interfaces لكل شيء قبل الحاجة الفعلية

---

## قاعدة البيانات

- **SQL Server** فقط — لا PostgreSQL، لا SQLite في production
- **EF Core** للوصول إلى البيانات
- Migrations يجب أن تكون صريحة ومراجَعة، لا auto-apply في production
- أسماء الجداول والأعمدة بالإنجليزية (snake_case أو PascalCase حسب الاتفاق)

---

## ما يجب تجنبه

- لا CQRS framework قبل الحاجة الفعلية
- لا Event Sourcing في المراحل الأولى
- لا Saga pattern إلا عند وجود distributed transactions حقيقية
- لا over-abstraction باسم "clean architecture"
- لا تكرار كود بحجة "كل module مستقل"
