import type { ColumnDef } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatInviteDate, statusLabel } from "../../utils"
import type { InviteListItem, InviteStatus } from "../../types"

type ColumnOptions = {
  onRevoke: (id: InviteListItem["_id"]) => void
  pendingRevokeId: InviteListItem["_id"] | null
  onDelete: (id: InviteListItem["_id"]) => void
  pendingDeleteId: InviteListItem["_id"] | null
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="ml-1 size-3.5" />
  if (sorted === "desc") return <ArrowDown className="ml-1 size-3.5" />
  return <ArrowUpDown className="ml-1 size-3.5 opacity-40" />
}

const statusBadgeVariant: Record<
  InviteStatus,
  "secondary" | "destructive" | "default"
> = {
  pending: "secondary",
  used: "default",
  revoked: "destructive",
}

export function createColumns({
  onRevoke,
  pendingRevokeId,
  onDelete,
  pendingDeleteId,
}: ColumnOptions): ColumnDef<InviteListItem>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={
            table.getIsSomePageRowsSelected() &&
            !table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(checked) =>
            table.toggleAllPageRowsSelected(!!checked)
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <SortIcon sorted={column.getIsSorted()} />
        </Button>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <SortIcon sorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant[row.original.status]}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue: string) => {
        if (!filterValue) return true
        return row.original.status === filterValue
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <SortIcon sorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatInviteDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "usedAt",
      sortUndefined: "last",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Used
          <SortIcon sorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatInviteDate(row.original.usedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        return (
          <div className="flex justify-end gap-1">
            {row.original.status === "pending" ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={pendingRevokeId === row.original._id}
                      onClick={() => onRevoke(row.original._id)}
                      aria-label="Revoke"
                    >
                      <X />
                    </Button>
                  }
                />
                <TooltipContent>Revoke</TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pendingDeleteId === row.original._id}
                    onClick={() => onDelete(row.original._id)}
                    className="text-destructive hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 />
                  </Button>
                }
              />
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ]
}
