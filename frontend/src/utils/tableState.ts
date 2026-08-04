export function filterItemsByText<T>(
  items: T[],
  query: string,
  fields: (item: T) => Array<string | number | boolean | null | undefined>,
) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return items
  }

  return items.filter((item) =>
    fields(item).some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery)),
  )
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const safePage = Math.max(1, page)
  const safePageSize = Math.max(1, pageSize)
  const startIndex = (safePage - 1) * safePageSize

  return items.slice(startIndex, startIndex + safePageSize)
}

export function getPageCount(totalItems: number, pageSize: number) {
  const safePageSize = Math.max(1, pageSize)

  return Math.max(1, Math.ceil(totalItems / safePageSize))
}
