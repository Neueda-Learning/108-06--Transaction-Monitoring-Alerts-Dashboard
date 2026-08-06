import type { ChangeEvent } from 'react'

interface PaginationControlsProps {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  rowsPerPageOptions?: number[]
  onPageChange: (page: number) => void
  onRowsPerPageChange?: (pageSize: number) => void
  loading?: boolean
}

export function PaginationControls({
  page,
  pageSize,
  totalItems,
  totalPages,
  rowsPerPageOptions = [5, 10, 25],
  onPageChange,
  onRowsPerPageChange,
  loading = false,
}: PaginationControlsProps) {
  if (totalItems === 0) {
    return null
  }

  const safeTotalPages = Math.max(1, totalPages)
  const safePage = Math.min(Math.max(1, page), safeTotalPages)
  const startItem = (safePage - 1) * pageSize + 1
  const endItem = Math.min(totalItems, safePage * pageSize)

  const handleRowsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onRowsPerPageChange?.(Number(event.target.value))
  }

  return (
    <div className="pagination-controls">
      <div className="pagination-summary">
        Showing {startItem}-{endItem} of {totalItems}
      </div>

      <div className="pagination-toolbar">
        {onRowsPerPageChange ? (
          <label className="pagination-size-picker">
            Rows per page
            <select value={pageSize} onChange={handleRowsPerPageChange} disabled={loading}>
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button type="button" className="ghost" onClick={() => onPageChange(safePage - 1)} disabled={loading || safePage <= 1}>
          Previous
        </button>

        <div className="pagination-pages" aria-label="Pagination pages">
          {Array.from({ length: safeTotalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={pageNumber === safePage ? 'pagination-page active' : 'pagination-page'}
              onClick={() => onPageChange(pageNumber)}
              disabled={loading}
              aria-current={pageNumber === safePage ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button type="button" className="ghost" onClick={() => onPageChange(safePage + 1)} disabled={loading || safePage >= safeTotalPages}>
          Next
        </button>
      </div>
    </div>
  )
}

