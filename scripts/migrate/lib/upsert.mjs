/**
 * Batched idempotent upserts + progress accounting.
 */
export async function upsertBatches(client, {
  table,
  rows,
  onConflict = 'id',
  batchSize = 250,
  select = 'id',
}) {
  const stats = {
    total: rows.length,
    upserted: 0,
    failed: 0,
    errors: [],
  }

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const { data, error } = await client
      .from(table)
      .upsert(chunk, { onConflict, ignoreDuplicates: false })
      .select(select)

    if (error) {
      stats.failed += chunk.length
      stats.errors.push({
        offset: i,
        size: chunk.length,
        message: error.message,
        code: error.code,
        details: error.details,
      })
      // Continue with remaining batches instead of aborting silently.
      continue
    }
    stats.upserted += data?.length || chunk.length
  }

  return stats
}

export async function countBySourcePrefix(client, table, prefix) {
  const { count, error } = await client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .like('source_key', `${prefix}%`)
  if (error) throw error
  return count || 0
}

export async function countDistinct(client, table, column, prefix = null) {
  // Prefer exact count on unique official identifiers when present.
  let query = client.from(table).select(column, { count: 'exact', head: true }).not(column, 'is', null)
  if (prefix) query = query.like('source_key', `${prefix}%`)
  const { count, error } = await query
  if (error) throw error
  return count || 0
}
