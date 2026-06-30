---
name: EF Core required-navigation projection silently drops rows
description: A null-checked projection over a required nav compiles to INNER JOIN and drops principal rows.
---

In EF Core, projecting `x.Nav != null ? x.Nav.SomeProp : fallback` where `Nav` is a **required** relationship compiles to an **INNER JOIN** on the related table, and if that related entity has a **global query filter** (e.g. `WHERE NOT IsDeleted`), the filter is applied to the join too. Net effect: principal rows whose related row is missing or soft-deleted are **silently dropped** from the result — while a separate `CountAsync` (which doesn't touch the nav) still counts them. Symptom: a paged list returns `totalCount > 0` but `items: []`.

Seen in Boioot `BuyerRequestService.GetPublicAsync`: `UserName = r.User != null ? r.User.FullName : ""` dropped published buyer-requests whose author was soft-deleted.

**Why:** the `!= null` ternary does not force a LEFT JOIN; EF still treats a required nav as inner, and the dependent's query filter compounds the row loss.

**How to apply:** Don't resolve a related field through a required navigation inside the row projection when you must keep every principal row. Instead project only the FK (e.g. `r.UserId`), then do a separate keyed lookup over the related table and map by key — adding `.IgnoreQueryFilters()` if you also need names of soft-deleted related rows. This mirrors how comment counts are batched in the same method and is robust to missing/filtered relations.
