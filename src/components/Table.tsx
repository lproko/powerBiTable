import React, { useState, useRef, useEffect } from "react";
import powerbi from "powerbi-visuals-api";
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
  selectionManager?: powerbi.extensibility.ISelectionManager;
  dataView?: powerbi.DataView;
  host?: powerbi.extensibility.visual.IVisualHost;
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
      <div
        style={{ padding: "24px", backgroundColor: "white", margin: "0 16px" }}
      >
        {actualNestedData.map((item, index) => (
          <div key={index} style={{ marginBottom: "24px" }}>
            {nestedColumns.map((column) => (
              <div key={column.accessorKey} style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#495057",
                    marginBottom: "4px",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {column.header}:
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#6c757d",
                    paddingLeft: "12px",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {item[column.accessorKey]}
                </div>
              </div>
            ))}
          </div>
        ))}
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
  selectionManager,
  dataView,
  host,
}) => {
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Sync with Power BI selections
  useEffect(() => {
    const syncSelections = async () => {
      if (!selectionManager || !dataView) return;

      const selections = await selectionManager.getSelectionIds();
      const newSelectedRows = new Set<string>();

      if (selections && selections.length > 0) {
        const mainCategories =
          dataView.categorical?.categories?.filter(
            (category) => category.source.roles?.category
          ) || [];

        if (mainCategories.length > 0) {
          const mainCategory = mainCategories[0];
          mainCategory.values.forEach((value, index) => {
            const selectionId = host
              ?.createSelectionIdBuilder()
              .withCategory(mainCategory, index)
              .createSelectionId();

            if (
              selections.some(
                (sel) => sel.toString() === selectionId.toString()
              )
            ) {
              newSelectedRows.add(index.toString());
            }
          });
        }
      }

      setSelectedRows(newSelectedRows);
      setSelectAll(newSelectedRows.size === data.length);
    };

    syncSelections();
  }, [selectionManager, dataView, data.length, host]);

  const toggleRow = (rowId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Handle row selection
  const handleRowSelection = async (rowIndex: number, checked: boolean) => {
    if (!selectionManager || !dataView || !host) return;

    const mainCategories =
      dataView.categorical?.categories?.filter(
        (category) => category.source.roles?.category
      ) || [];

    if (mainCategories.length === 0) return;

    // Create selection ID based on the first main category
    const mainCategory = mainCategories[0];
    const value = mainCategory.values[rowIndex];

    const selectionId = host
      .createSelectionIdBuilder()
      .withCategory(mainCategory, rowIndex)
      .createSelectionId();

    if (checked) {
      await selectionManager.select(selectionId, false);
    } else {
      await selectionManager.clear();
    }

    // Update local state
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(rowIndex.toString());
    } else {
      newSelectedRows.delete(rowIndex.toString());
    }
    setSelectedRows(newSelectedRows);
  };

  // Handle select all
  const handleSelectAll = async (checked: boolean) => {
    if (!selectionManager || !dataView || !host) return;

    if (checked) {
      const mainCategories =
        dataView.categorical?.categories?.filter(
          (category) => category.source.roles?.category
        ) || [];

      if (mainCategories.length === 0) return;

      const mainCategory = mainCategories[0];
      const selectionIds = mainCategory.values.map((value, index) =>
        host
          .createSelectionIdBuilder()
          .withCategory(mainCategory, index)
          .createSelectionId()
      );

      await selectionManager.select(selectionIds, false);
      setSelectedRows(new Set(data.map((_, index) => index.toString())));
    } else {
      await selectionManager.clear();
      setSelectedRows(new Set());
    }
    setSelectAll(checked);
  };

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
    setCurrentPage(0); // Reset to first page when sorting
  };

  // Filter and sort data
  const filteredData = searchTerm
    ? data.filter((row) => {
        const firstColumnKey = columns[0]?.accessorKey;
        if (!firstColumnKey) return true;
        const cellValue = String(row[firstColumnKey]).toLowerCase();
        return cellValue.includes(searchTerm.toLowerCase());
      })
    : data;

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;

    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (aValue === bValue) return 0;

    const comparison = aValue < bValue ? -1 : 1;
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Calculate pagination
  const pageCount = Math.ceil(sortedData.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = sortedData.slice(startIndex, endIndex);

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
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: "40px",
                  padding: "12px 8px",
                  borderBottom: "1px solid #ddd",
                  backgroundColor: "#f5f5f5",
                  fontSize: "14px",
                  fontWeight: "bold",
                  fontFamily: "Arial, sans-serif",
                  textAlign: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{
                    cursor: "pointer",
                  }}
                />
              </th>
              {columns.map((column, index) => (
                <th
                  key={column.accessorKey}
                  style={{
                    padding: "12px 8px",
                    borderBottom: "1px solid #ddd",
                    backgroundColor: "#f5f5f5",
                    textAlign: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                    fontFamily: "Arial, sans-serif",
                    cursor: index === 0 ? "pointer" : "default",
                    userSelect: "none",
                    maxWidth: index === 0 ? "400px" : "auto",
                    width: index === 0 ? "400px" : "auto",
                  }}
                  onClick={
                    index === 0
                      ? () => handleSort(column.accessorKey)
                      : undefined
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      flexDirection: "row",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {column.header}
                      {index === 0 && (
                        <span style={{ fontSize: "12px", color: "#666" }}>
                          {sortColumn === column.accessorKey
                            ? sortDirection === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      )}
                    </div>
                    {index === 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(0);
                          }}
                          placeholder="Search..."
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontFamily: "Arial, sans-serif",
                            width: "120px",
                            outline: "none",
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#80bdff";
                            e.target.style.boxShadow =
                              "0 0 0 0.2rem rgba(0,123,255,.25)";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#ddd";
                            e.target.style.boxShadow = "none";
                          }}
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm("")}
                            style={{
                              padding: "2px 6px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              backgroundColor: "white",
                              cursor: "pointer",
                              fontSize: "10px",
                              fontFamily: "Arial, sans-serif",
                              marginLeft: "4px",
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              <th
                style={{
                  width: "40px",
                  padding: "12px 8px",
                  borderBottom: "1px solid #ddd",
                  backgroundColor: "#f5f5f5",
                  fontSize: "14px",
                  fontWeight: "bold",
                  fontFamily: "Arial, sans-serif",
                  textAlign: "center",
                }}
              />
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <React.Fragment key={startIndex + index}>
                <tr>
                  <td
                    style={{
                      padding: "12px 8px",
                      borderBottom: "1px solid #ddd",
                      textAlign: "center",
                      fontSize: "14px",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRows.has(
                        (startIndex + index).toString()
                      )}
                      onChange={(e) =>
                        handleRowSelection(startIndex + index, e.target.checked)
                      }
                      style={{
                        cursor: "pointer",
                      }}
                    />
                  </td>
                  {columns.map((column, columnIndex) => {
                    const cellValue = row[column.accessorKey];
                    const isYes = String(cellValue).toLowerCase() === "yes";
                    const isNo = String(cellValue).toLowerCase() === "no";

                    return (
                      <td
                        key={column.accessorKey}
                        style={{
                          padding: "12px 8px",
                          borderBottom: "1px solid #ddd",
                          textAlign: columnIndex === 0 ? "left" : "center",
                          fontSize: "14px",
                          fontFamily: "Arial, sans-serif",
                          maxWidth: columnIndex === 0 ? "400px" : "auto",
                          width: columnIndex === 0 ? "400px" : "auto",
                          wordWrap: columnIndex === 0 ? "break-word" : "normal",
                          whiteSpace: columnIndex === 0 ? "normal" : "nowrap",
                          overflow: columnIndex === 0 ? "hidden" : "visible",
                        }}
                      >
                        {columnIndex === 1 ? (
                          // Second column: show circle icons
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: isYes ? "#000" : "transparent",
                                border: isNo ? "2px solid #000" : "none",
                                display: "inline-block",
                              }}
                            />
                          </div>
                        ) : // Other columns: show Yes/No badges or regular text
                        isYes || isNo ? (
                          <span
                            style={{
                              backgroundColor: isYes ? "#d4edda" : "#f8d7da",
                              color: isYes ? "#155724" : "#721c24",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontWeight: "500",
                              display: "inline-block",
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            {cellValue}
                          </span>
                        ) : (
                          cellValue
                        )}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      padding: "12px 8px",
                      borderBottom: "1px solid #ddd",
                      textAlign: "center",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontFamily: "Arial, sans-serif",
                    }}
                    onClick={() => toggleRow((startIndex + index).toString())}
                  >
                    {expanded[(startIndex + index).toString()] ? "⮝" : "⮟"}
                  </td>
                </tr>
                {expanded[(startIndex + index).toString()] && (
                  <tr>
                    <td colSpan={columns.length + 2}>
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
