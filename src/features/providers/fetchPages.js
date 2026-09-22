/**
 * Shared paginated select helper for large registry tables.
 */
export async function fetchAllPages(queryFactory, {
  pageSize = 1000,
  maxRows = Infinity,
} = {}) {
  const rows = []
  let from = 0
  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await queryFactory(from, to)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < pageSize || rows.length >= maxRows) break
    from += pageSize
  }
  return rows.slice(0, maxRows)
}
