import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type LocationState = { from?: string };

/** Vuelve a la pantalla anterior (historial o `state.from`), con fallback fijo. */
export function useAppBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const from = (location.state as LocationState | null)?.from;
    if (from) {
      navigate(from);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }, [navigate, location.state, fallback]);
}
