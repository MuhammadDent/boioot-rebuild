# Boioot Frontend — القواعد الهندسية

## المبدأ الأساسي

تطبيق Next.js واحد يحتوي على ثلاثة أقسام: الموقع العام، لوحة تحكم المستخدم، لوحة الإدارة.
لا تطبيقات منفصلة، لا monorepo frontend متعدد.

---

## هيكل المجلدات

```
src/
  app/                  ← Next.js App Router (routing فقط)
    (public site)/      ← الموقع العام
    dashboard/          ← لوحة تحكم المستخدم
    admin/              ← لوحة الإدارة
  components/           ← مكونات مشتركة حقاً عبر أقسام متعددة
    layout/             ← Header, Footer, Sidebar
  features/             ← منطق كل feature منعزل في مجلده
  lib/                  ← utilities, API client, helpers
  styles/               ← theme.css وملفات CSS العامة
  types/                ← TypeScript types مشتركة
```

---

## Feature-Based Organization

- كل feature يملك مجلده داخل `features/`
- المجلد يحتوي على: components خاصة به، hooks، types، وapi calls
- لا تضع مكوناً في `components/` إلا إذا استُخدم في قسمين مختلفين على الأقل

---

## قواعد المكونات

- **Server Components بالافتراضي** — استخدم `"use client"` فقط عند الحاجة الفعلية
- **لا props drilling عميق** — استخدم Context أو state management عند الحاجة
- **لا مكونات عامة مبكرة** — اجعل المكون خاصاً أولاً، ثم اجعله عاماً إذا تكرر
- **أسماء المكونات بالإنجليزية** في الكود، النصوص المعروضة بالعربية

---

## اللغة والاتجاه

- **RTL أولاً**: كل التخطيطات تُبنى للعربية من البداية
- `dir="rtl"` و`lang="ar"` على `<html>` دائماً
- استخدم CSS logical properties: `margin-inline-start` بدل `margin-right`
- لا hard-coded LTR في التصميم

---

## التصميم

- اتبع `docs/ui-identity-reference.md` كمرجع للهوية البصرية
- الأخضر `#2E7D32` هو اللون الوحيد للـ primary — لا تغييره
- لا Tailwind utilities تكسر RTL بصمت
- لا `absolute` positioning مفرط يكسر عند تغيير الاتجاه

---

## ما يجب تجنبه

- لا UI component library ضخمة (MUI, Chakra) قبل تقييم الحاجة
- لا animation مكتبات ثقيلة في المراحل الأولى
- لا over-fetching — اجلب البيانات التي تحتاجها فقط
- لا global state لكل شيء — Server Components تحل كثيراً من مشاكل الـ state
- لا تصميم "luxury" يبتعد عن هوية بيوت المحلية والعملية
