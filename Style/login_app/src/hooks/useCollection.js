import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../services/api";
export function useCollection(path) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get(path, { params: { page, limit: 20 } })
      .then(({ data }) => {
        if (!active) return;
        if (page > 1 && !data.items.length) {
          setPage(page - 1);
          return;
        }
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, page, version]);
  return { items, total, page, setPage, loading, error, refresh };
}
