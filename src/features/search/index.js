export { SearchProvider, useSearchStore, useSearchQuery } from './SearchProvider'
export {
  SEARCH_SCOPES,
  SCOPE_DOMAINS,
  SCOPE_COPY,
  resolveSearchScope,
  getScopeCopy,
} from './scopes'
export {
  normalizeSearchQuery,
  compactSearchText,
  textMatchesQuery,
  fieldsMatchQuery,
  rankSearchMatch,
  rankFieldsMatch,
  sortBySearchRank,
  highlightMatch,
} from './searchMatch'
export { searchSpecialties, SPECIALTY_SEARCH_TERMS } from './specialtyTerms'
export {
  loadRecentSearches,
  pushRecentSearch,
  clearRecentSearches,
  loadScopeQuery,
  saveScopeQuery,
} from './recentSearches'
export { runContextualSearch } from './engine'
export { useContextualSearch } from './useContextualSearch'
export {
  useVoiceSearch,
  VOICE_STATE,
  voiceErrorMessage,
  voiceStatusMessage,
  detectVoiceCapabilities,
  VoiceSearchService,
  queueVoiceStart,
  takeVoiceStart,
  clearVoiceStart,
} from './voice'
