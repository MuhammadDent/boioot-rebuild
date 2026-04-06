using Boioot.Application.Exceptions;
using Boioot.Application.Features.Blog.DTOs;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Blog.Validation;

public static class BlogPostValidation
{
    public static void EnsureCreateValid(CreateBlogPostRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new BoiootException("عنوان المقال مطلوب", 400);

        if (request.Title.Length > 500)
            throw new BoiootException("عنوان المقال لا يمكن أن يتجاوز 500 حرف", 400);

        if (string.IsNullOrWhiteSpace(request.Content))
            throw new BoiootException("محتوى المقال مطلوب", 400);

        if (request.Slug is not null && request.Slug.Length > 500)
            throw new BoiootException("الـ slug لا يمكن أن يتجاوز 500 حرف", 400);

        if (request.SeoTitle is not null && request.SeoTitle.Length > 500)
            throw new BoiootException("عنوان SEO لا يمكن أن يتجاوز 500 حرف", 400);

        if (request.SeoDescription is not null && request.SeoDescription.Length > 1000)
            throw new BoiootException("وصف SEO لا يمكن أن يتجاوز 1000 حرف", 400);

        if (request.ReadTimeMinutes is < 0)
            throw new BoiootException("وقت القراءة يجب أن يكون قيمة موجبة", 400);
    }

    public static void EnsureUpdateValid(UpdateBlogPostRequest request)
    {
        if (request.Title is not null && string.IsNullOrWhiteSpace(request.Title))
            throw new BoiootException("عنوان المقال لا يمكن أن يكون فارغاً", 400);

        if (request.Title?.Length > 500)
            throw new BoiootException("عنوان المقال لا يمكن أن يتجاوز 500 حرف", 400);

        if (request.Content is not null && string.IsNullOrWhiteSpace(request.Content))
            throw new BoiootException("محتوى المقال لا يمكن أن يكون فارغاً", 400);

        if (request.Slug is not null && string.IsNullOrWhiteSpace(request.Slug))
            throw new BoiootException("الـ slug لا يمكن أن يكون فارغاً", 400);

        if (request.Slug?.Length > 500)
            throw new BoiootException("الـ slug لا يمكن أن يتجاوز 500 حرف", 400);

        if (request.SeoTitle?.Length > 500)
            throw new BoiootException("عنوان SEO لا يمكن أن يتجاوز 500 حرف", 400);

        if (request.SeoDescription?.Length > 1000)
            throw new BoiootException("وصف SEO لا يمكن أن يتجاوز 1000 حرف", 400);

        if (request.ReadTimeMinutes is < 0)
            throw new BoiootException("وقت القراءة يجب أن يكون قيمة موجبة", 400);
    }

    public static void EnsurePublishReady(BlogPost post)
    {
        if (post.Status == BlogPostStatus.Archived)
            throw new BoiootException("لا يمكن نشر مقال مؤرشف. قم بإلغاء الأرشفة أولاً عبر Unpublish ثم أعد النشر", 409);

        if (post.Status == BlogPostStatus.Published)
            throw new BoiootException("المقال منشور بالفعل", 409);

        if (string.IsNullOrWhiteSpace(post.Title))
            throw new BoiootException("لا يمكن نشر المقال: العنوان مطلوب", 422);

        if (string.IsNullOrWhiteSpace(post.Slug))
            throw new BoiootException("لا يمكن نشر المقال: الـ slug مطلوب", 422);

        if (string.IsNullOrWhiteSpace(post.Content))
            throw new BoiootException("لا يمكن نشر المقال: المحتوى مطلوب للنشر", 422);
    }
}
