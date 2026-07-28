"use client";

import * as React from "react";

const subscribe = () => () => {};

/**
 * `false` при серверном рендере и на первом клиентском проходе, `true` после
 * гидратации. Нужен там, где разметка зависит от клиентского состояния
 * (выбранная тема), иначе сервер и клиент разойдутся.
 *
 * useSyncExternalStore, а не `useState` + `useEffect`: последний вызывает
 * setState прямо в эффекте и порождает каскадный ререндер.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
