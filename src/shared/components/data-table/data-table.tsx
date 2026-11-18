import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState, type ReactNode } from "react";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";

import { DataTablePagination } from "./data-table-pagination";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  /** Stable id per row — keeps the selection correct across refetches and filters. */
  getRowId: (row: TData) => string;

  /** Leading "#" column, numbered across pages. Default true. */
  showIndex?: boolean;
  /** Checkbox column + selection. Default true. */
  selectable?: boolean;
  /** Controlled selection: { [rowId]: true }. Omit to let the table manage it. */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;

  pageSize?: number;
  pageSizeOptions?: number[];

  /** Click on a row (not on its buttons, links, checkboxes or portaled menus/dialogs). */
  onRowClick?: (row: TData) => void;

  loading?: boolean;
  /** Shown when `data` is empty. */
  empty?: ReactNode;
  className?: string;
}

/**
 * Shared table for list screens: index, checkbox selection and pagination.
 * Filtering is up to the caller — pass already-filtered `data`.
 *
 * @example
 * <DataTable columns={columns} data={rows} getRowId={(r) => r.id}
 *   rowSelection={sel} onRowSelectionChange={setSel} />
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  showIndex = true,
  selectable = true,
  rowSelection: controlledSelection,
  onRowSelectionChange,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  onRowClick,
  loading,
  empty = "Không có dữ liệu.",
  className,
}: DataTableProps<TData>) {
  const [innerSelection, setInnerSelection] = useState<RowSelectionState>({});
  const rowSelection = controlledSelection ?? innerSelection;

  const allColumns = useMemo<ColumnDef<TData>[]>(() => {
    const lead: ColumnDef<TData>[] = [];
    if (selectable) {
      lead.push({
        id: "__select",
        size: 36,
        header: ({ table }) => (
          <Checkbox
            aria-label="Chọn tất cả trên trang"
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Chọn dòng"
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
          />
        ),
      });
    }
    if (showIndex) {
      lead.push({
        id: "__index",
        size: 48,
        header: "#",
        cell: ({ row, table }) => {
          const { pageIndex, pageSize: size } = table.getState().pagination;
          const position = table.getRowModel().rows.findIndex((r) => r.id === row.id);
          return (
            <span className="text-muted-foreground tabular-nums">
              {pageIndex * size + position + 1}
            </span>
          );
        },
      });
    }
    return [...lead, ...columns];
  }, [columns, selectable, showIndex]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: { rowSelection },
    enableRowSelection: selectable,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      if (onRowSelectionChange) onRowSelectionChange(next);
      else setInnerSelection(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={
                      header.column.id.startsWith("__") ? { width: header.getSize() } : undefined
                    }
                    className="h-10 first:pl-4 last:pr-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={allColumns.length} className="px-4">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={allColumns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={
                    onRowClick &&
                    ((e) => {
                      const target = e.target as HTMLElement;
                      // React bubbles events out of portals (menus, dialogs): ignore those.
                      if (!e.currentTarget.contains(target)) return;
                      if (target.closest("button, a, input, [role=checkbox]")) return;
                      onRowClick(row.original);
                    })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 first:pl-4 last:pr-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && data.length > 0 && (
        <DataTablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
          showSelection={selectable}
        />
      )}
    </div>
  );
}
