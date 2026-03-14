interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onPage: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  totalCount,
  onPage,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        السابق
      </button>

      <span className="pagination__info">
        صفحة {page} من {totalPages} ({totalCount} نتيجة)
      </span>

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        التالي
      </button>
    </div>
  );
}
