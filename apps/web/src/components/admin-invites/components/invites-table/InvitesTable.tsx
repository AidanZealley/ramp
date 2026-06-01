import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Search } from "lucide-react"
import { createColumns } from "./columns"
import type {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table"
import type { InviteListItem, InviteStatus } from "../../types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"

const STATUS_OPTIONS: Array<{ value: InviteStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "used", label: "Used" },
  { value: "revoked", label: "Revoked" },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]

type InvitesTableProps = {
  data: Array<InviteListItem>
  onRevoke: (id: InviteListItem["_id"]) => void
  pendingRevokeId: InviteListItem["_id"] | null
  onDelete: (id: InviteListItem["_id"]) => void
  pendingDeleteId: InviteListItem["_id"] | null
}

export function InvitesTable({
  data,
  onRevoke,
  pendingRevokeId,
  onDelete,
  pendingDeleteId,
}: InvitesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [statusFilter, setStatusFilter] = React.useState<InviteStatus | "">("")

  const columns = React.useMemo(
    () => createColumns({ onRevoke, pendingRevokeId, onDelete, pendingDeleteId }),
    [onRevoke, pendingRevokeId, onDelete, pendingDeleteId]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const emailFilter = table.getColumn("email")?.getFilterValue() as string
  const pendingSelectedCount = selectedRows.filter(
    (row) => row.original.status === "pending"
  ).length

  function handleEmailSearch(value: string) {
    table.getColumn("email")?.setFilterValue(value || undefined)
    table.setPageIndex(0)
  }

  function handleStatusFilter(value: InviteStatus | "") {
    setStatusFilter(value)
    table.getColumn("status")?.setFilterValue(value || undefined)
    table.setPageIndex(0)
  }

  function handleBulkRevoke() {
    for (const row of selectedRows) {
      if (row.original.status === "pending") {
        onRevoke(row.original._id)
      }
    }
    setRowSelection({})
  }

  function handleBulkDelete() {
    for (const row of selectedRows) {
      onDelete(row.original._id)
    }
    setRowSelection({})
  }

  const totalFiltered = table.getFilteredRowModel().rows.length

  return (
    <TooltipProvider>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={emailFilter}
            onChange={(e) => handleEmailSearch(e.currentTarget.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-0.5">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              variant={statusFilter === value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleStatusFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {selectedRows.length > 0 ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-2 text-sm">
          <span className="text-muted-foreground">
            {selectedRows.length} row{selectedRows.length !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            disabled={pendingSelectedCount === 0}
            onClick={handleBulkRevoke}
          >
            Revoke{" "}
            {pendingSelectedCount > 0
              ? `${pendingSelectedCount} pending`
              : "selected"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            Delete {selectedRows.length}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRowSelection({})}
            className="ml-auto"
          >
            Clear
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No invites found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {totalFiltered} invite{totalFiltered !== 1 ? "s" : ""}
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <div className="flex gap-0.5">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Button
                  key={size}
                  variant={pagination.pageSize === size ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    table.setPageSize(size)
                    table.setPageIndex(0)
                  }}
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(table.getPageCount(), 1)}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}
