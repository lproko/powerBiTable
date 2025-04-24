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
  RowData,
} from "@tanstack/react-table";

// Add a type extension for expandable rows
declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}

interface TableProps {
  columns: {
    header: string;
    accessorKey: string;
  }[];
  data: any[];
  nestedData: any[] | ((row: any) => any[]);
  nestedColumns?: {
    header: string;
    accessorKey: string;
  }[];
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

// Nested table component
const NestedTable: React.FC<{
  rowData: any;
  nestedData: any[] | ((row: any) => any[]);
  nestedColumns?: {
    header: string;
    accessorKey: string;
  }[];
}> = ({ rowData, nestedData: nestedDataProp, nestedColumns }) => {
  console.log("NestedTable Props:", { rowData, nestedDataProp, nestedColumns });

  // Get the actual nested data
  const actualNestedData =
    typeof nestedDataProp === "function"
      ? nestedDataProp(rowData)
      : nestedDataProp;

  console.log("Actual nested data:", actualNestedData);

  // If we have nested columns and data, use them
  if (nestedColumns && actualNestedData && actualNestedData.length > 0) {
    return (
      <div style={{ padding: "16px", backgroundColor: "#f8f9fa" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {nestedColumns.map((column) => (
                <th
                  key={column.accessorKey}
                  style={{
                    padding: "8px",
                    border: "1px solid #ddd",
                    backgroundColor: "#e9ecef",
                    textAlign: "left",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actualNestedData.map((item, index) => (
              <tr key={index}>
                {nestedColumns.map((column) => (
                  <td
                    key={column.accessorKey}
                    style={{
                      padding: "8px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "300px",
                    }}
                    title={String(item[column.accessorKey])}
                  >
                    {item[column.accessorKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
};

export const Table: React.FC<TableProps> = ({
  columns,
  data,
  nestedData,
  nestedColumns,
}) => {
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const toggleRow = (rowId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Calculate pagination
  const pageCount = Math.ceil(data.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  width: "40px",
                  padding: "12px 8px",
                  border: "1px solid #ddd",
                  backgroundColor: "#f5f5f5",
                }}
              />
              {columns.map((column) => (
                <th
                  key={column.accessorKey}
                  style={{
                    padding: "12px 8px",
                    border: "1px solid #ddd",
                    backgroundColor: "#f5f5f5",
                    textAlign: "left",
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <React.Fragment key={startIndex + index}>
                <tr>
                  <td
                    style={{
                      padding: "12px 8px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleRow((startIndex + index).toString())}
                  >
                    {expanded[(startIndex + index).toString()] ? "−" : "+"}
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column.accessorKey}
                      style={{
                        padding: "12px 8px",
                        border: "1px solid #ddd",
                      }}
                    >
                      {row[column.accessorKey]}
                    </td>
                  ))}
                </tr>
                {expanded[(startIndex + index).toString()] && (
                  <tr>
                    <td colSpan={columns.length + 1}>
                      <NestedTable
                        rowData={row}
                        nestedData={nestedData}
                        nestedColumns={nestedColumns}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: currentPage === 0 ? "not-allowed" : "pointer",
            }}
          >
            {"<<"}
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: currentPage === 0 ? "not-allowed" : "pointer",
            }}
          >
            {"<"}
          </button>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(pageCount - 1, prev + 1))
            }
            disabled={currentPage === pageCount - 1}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: currentPage === pageCount - 1 ? "not-allowed" : "pointer",
            }}
          >
            {">"}
          </button>
          <button
            onClick={() => setCurrentPage(pageCount - 1)}
            disabled={currentPage === pageCount - 1}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: currentPage === pageCount - 1 ? "not-allowed" : "pointer",
            }}
          >
            {">>"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <PageSizeDropdown
            value={pageSize}
            onChange={(value) => {
              setPageSize(value);
              setCurrentPage(0); // Reset to first page when changing page size
            }}
          />
        </div>
      </div>
    </div>
  );
};
