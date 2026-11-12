export default function Pagination({ collection }) {
  const { page, total, setPage, loading } = collection;
  return (
    <div className="flex items-center gap-4 text-sm mt-4">
      <button
        disabled={loading || page === 1}
        onClick={() => setPage(page - 1)}
        className="border rounded px-3 py-1 disabled:opacity-40"
      >
        Anterior
      </button>
      <span>
        Página {page} · {total} registros
      </span>
      <button
        disabled={loading || page * 20 >= total}
        onClick={() => setPage(page + 1)}
        className="border rounded px-3 py-1 disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}
