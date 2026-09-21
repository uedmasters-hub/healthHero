/**
 * Doctor catalog façade — backed by the shared provider repository
 * (Supabase + PocketPills import snapshot). Kept for stable import paths.
 */
export {
  getDoctorById,
  getDoctorPhoto,
  getDoctorList,
  getSpecialtyList,
  getCityList,
  getProviderCatalog,
} from '../features/providers'

import {
  getSpecialtyList,
  getCityList,
  getProviderCatalog,
} from '../features/providers'

function liveArray(getter) {
  return new Proxy([], {
    get(_target, prop) {
      const list = getter()
      if (prop === 'length') return list.length
      if (prop === Symbol.iterator) return list[Symbol.iterator].bind(list)
      if (prop === 'map' || prop === 'filter' || prop === 'find' || prop === 'forEach' || prop === 'slice' || prop === 'includes' || prop === 'some' || prop === 'every') {
        return list[prop].bind(list)
      }
      if (typeof prop === 'string' && /^\d+$/.test(prop)) return list[Number(prop)]
      const value = list[prop]
      return typeof value === 'function' ? value.bind(list) : value
    },
  })
}

/** Live-updating array views over the provider repository cache. */
export const allDoctors = liveArray(getProviderCatalog)
export const specialtyList = liveArray(getSpecialtyList)
export const cityList = liveArray(getCityList)
