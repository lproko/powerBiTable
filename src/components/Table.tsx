import React, { useState, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getPaginationRowModel,
  getFilteredRowModel,
  FilterFn,
  ColumnResizeMode,
  getExpandedRowModel,
  getGroupedRowModel,
} from "@tanstack/react-table";

interface TableProps {
  columns: {
    header: string;
    accessorKey: string;
  }[];
  data: any[];
}

// Custom filter functions
const numberFilter: FilterFn<any> = (row, columnId, filterValue, addMeta) => {
  const value = row.getValue(columnId);
  if (typeof value !== "number") return true;

  const [operator, number] = filterValue;
  const filterNumber = Number(number);

  switch (operator) {
    case "equals":
      return value === filterNumber;
    case "greater":
      return value > filterNumber;
    case "less":
      return value < filterNumber;
    default:
      return true;
  }
};

const stringFilter: FilterFn<any> = (row, columnId, filterValue, addMeta) => {
  const value = row.getValue(columnId);
  if (typeof value !== "string") return true;
  return value.toLowerCase().includes(filterValue.toLowerCase());
};

const FilterComponent: React.FC<{
  column: any;
  data: any[];
}> = ({ column, data }) => {
  const [filterValue, setFilterValue] = useState("");
  const [operator, setOperator] = useState("equals");
  const firstValue = data[0]?.[column.id];
  const isNumber = typeof firstValue === "number";

  if (isNumber) {
    return (
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          padding: "4px",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px",
          border: "1px solid #e9ecef",
        }}
      >
        <select
          value={operator}
          onChange={(e) => {
            setOperator(e.target.value);
            column.setFilterValue([e.target.value, filterValue]);
          }}
          style={{
            padding: "6px 8px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: "white",
            color: "#495057",
            cursor: "pointer",
            outline: "none",
            minWidth: "100px",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#80bdff";
            e.target.style.boxShadow = "0 0 0 0.2rem rgba(0,123,255,.25)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#ced4da";
            e.target.style.boxShadow = "none";
          }}
        >
          <option value="equals">Equals</option>
          <option value="greater">Greater than</option>
          <option value="less">Less than</option>
        </select>
        <input
          type="number"
          value={filterValue}
          onChange={(e) => {
            setFilterValue(e.target.value);
            column.setFilterValue([operator, e.target.value]);
          }}
          style={{
            padding: "6px 8px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            width: "80px",
            fontSize: "14px",
            backgroundColor: "white",
            color: "#495057",
            outline: "none",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#80bdff";
            e.target.style.boxShadow = "0 0 0 0.2rem rgba(0,123,255,.25)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#ced4da";
            e.target.style.boxShadow = "none";
          }}
          placeholder="Value..."
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "4px",
        backgroundColor: "#f8f9fa",
        borderRadius: "4px",
        border: "1px solid #e9ecef",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <input
        value={filterValue}
        onChange={(e) => {
          setFilterValue(e.target.value);
          column.setFilterValue(e.target.value);
        }}
        placeholder="Filter..."
        style={{
          padding: "6px 8px",
          border: "1px solid #ced4da",
          borderRadius: "4px",
          width: "100%",
          fontSize: "14px",
          backgroundColor: "white",
          color: "#495057",
          outline: "none",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#80bdff";
          e.target.style.boxShadow = "0 0 0 0.2rem rgba(0,123,255,.25)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#ced4da";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
};

const PageSizeDropdown: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const options = [10, 20, 30, 40, 50];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "4px 8px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "white",
          width: "100px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "14px",
        }}
      >
        <span>Show {value}</span>
        <span style={{ marginLeft: "8px" }}>▼</span>
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            zIndex: 1000,
          }}
        >
          {options.map((option) => (
            <div
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              style={{
                padding: "8px",
                cursor: "pointer",
                backgroundColor: option === value ? "#f5f5f5" : "white",
                fontSize: "14px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor =
                  option === value ? "#f5f5f5" : "white";
              }}
            >
              Show {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GroupBySelector: React.FC<{
  columns: any[];
  grouping: string[];
  onGroupingChange: (grouping: string[]) => void;
}> = ({ columns, grouping, onGroupingChange }) => {
  return (
    <div
      style={{
        padding: "8px",
        borderBottom: "1px solid #ddd",
        backgroundColor: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span style={{ fontSize: "14px", color: "#495057" }}>Group by:</span>
      <select
        value={grouping[0] || ""}
        onChange={(e) => {
          onGroupingChange(e.target.value ? [e.target.value] : []);
        }}
        style={{
          padding: "6px 8px",
          border: "1px solid #ced4da",
          borderRadius: "4px",
          fontSize: "14px",
          backgroundColor: "white",
          color: "#495057",
          outline: "none",
          minWidth: "150px",
        }}
      >
        <option value="">No grouping</option>
        {columns.map((column) => (
          <option key={column.accessorKey} value={column.accessorKey}>
            {column.header}
          </option>
        ))}
      </select>
    </div>
  );
};

export const Table: React.FC<TableProps> = ({ columns, data }) => {
  const columnHelper = createColumnHelper<any>();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");
  const [columnSizing, setColumnSizing] = useState({});
  const [expanded, setExpanded] = useState({});
  const [grouping, setGrouping] = useState<string[]>([]);

  const tableColumns = columns.map((column) =>
    columnHelper.accessor(column.accessorKey, {
      header: column.header,
      cell: (info) => info.getValue(),
      filterFn: (row, columnId, filterValue, addMeta) => {
        const value = row.getValue(columnId);
        if (typeof value === "number") {
          return numberFilter(row, columnId, filterValue, addMeta);
        }
        return stringFilter(row, columnId, filterValue, addMeta);
      },
    })
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    columnResizeMode,
    onColumnSizingChange: setColumnSizing,
    onExpandedChange: setExpanded,
    onGroupingChange: setGrouping,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
      columnSizing,
      expanded,
      grouping,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({ pageIndex, pageSize });
        setPageIndex(newState.pageIndex);
        setPageSize(newState.pageSize);
      }
    },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <GroupBySelector
        columns={columns}
        grouping={grouping}
        onGroupingChange={setGrouping}
      />
      <div style={{ flex: 1, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      padding: "12px 8px",
                      border: "1px solid #ddd",
                      backgroundColor: "#f5f5f5",
                      textAlign: "left",
                      position: "relative",
                      width: header.getSize(),
                    }}
                  >
                    <div
                      style={{
                        marginBottom: "8px",
                        fontWeight: "600",
                        color: "#212529",
                        fontSize: "14px",
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </div>
                    <FilterComponent column={header.column} data={data} />
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "5px",
                        cursor: "col-resize",
                        userSelect: "none",
                        touchAction: "none",
                        backgroundColor: header.column.getIsResizing()
                          ? "#2196f3"
                          : "transparent",
                      }}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      padding: "12px 8px",
                      border: "1px solid #ddd",
                      width: cell.column.getSize(),
                      fontSize: "14px",
                      color: "#212529",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: cell.column.getSize(),
                      backgroundColor: row.getIsGrouped() ? "#f8f9fa" : "white",
                    }}
                    title={String(cell.getValue())}
                  >
                    {row.getIsGrouped() ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={row.getToggleExpandedHandler()}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "0",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#495057",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {row.getIsExpanded() ? "▼" : "▶"}
                        </button>
                        <span>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                          {` (${row.subRows.length})`}
                        </span>
                      </div>
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          padding: "8px",
          borderTop: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: table.getCanPreviousPage() ? "pointer" : "not-allowed",
            }}
          >
            {"<<"}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: table.getCanPreviousPage() ? "pointer" : "not-allowed",
            }}
          >
            {"<"}
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: table.getCanNextPage() ? "pointer" : "not-allowed",
            }}
          >
            {">"}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: table.getCanNextPage() ? "pointer" : "not-allowed",
            }}
          >
            {">>"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <PageSizeDropdown
            value={table.getState().pagination.pageSize}
            onChange={(value) => table.setPageSize(value)}
          />
        </div>
      </div>
    </div>
  );
};
