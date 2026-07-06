import { useSyncExternalStore } from 'react'

const query = '(pointer: coarse)'
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}
const getSnapshot = () => window.matchMedia(query).matches

/** 觸控（粗指標）裝置：關 tooltip/hover、降 AA 與 dpr */
export function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
