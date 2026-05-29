import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/** Vuelve a la pantalla anterior del historial; si no hay, usa la ruta de respaldo. */
export function useAppBack(fallback: string) {
  const navigate = useNavigate();

  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
