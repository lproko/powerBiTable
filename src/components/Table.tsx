import React, { useState, useRef, useEffect } from "react";
import powerbi from "powerbi-visuals-api";
import { IoFilter } from "react-icons/io5";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { FaFilterCircleXmark } from "react-icons/fa6";
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

// Nested table component
const NestedTable: React.FC<{
  rowData: any;
  nestedData: any[] | ((row: any) => any[]);
  nestedColumns?: {
    header: string;
    accessorKey: string;
  }[];
}> = ({ rowData, nestedData: nestedDataProp, nestedColumns }) => {
  // Get the actual nested data
  const actualNestedData =
    typeof nestedDataProp === "function"
      ? nestedDataProp(rowData)
      : nestedDataProp;

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
  const [visibleRows, setVisibleRows] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isUserSelecting, setIsUserSelecting] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<"contains" | "equal">(
    "contains"
  );
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const [showOperatorDropdown, setShowOperatorDropdown] = useState(false);
  const searchMenuRef = useRef<HTMLDivElement>(null);
  const operatorDropdownRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Close search menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchMenuRef.current &&
        !searchMenuRef.current.contains(event.target as Node)
      ) {
        setShowSearchMenu(false);
      }
      if (
        operatorDropdownRef.current &&
        !operatorDropdownRef.current.contains(event.target as Node)
      ) {
        setShowOperatorDropdown(false);
      }
    };

    if (showSearchMenu || showOperatorDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearchMenu, showOperatorDropdown]);

  // Sync with Power BI selections
  useEffect(() => {
    const syncSelections = async () => {
      if (!selectionManager || !dataView || isUserSelecting) {
        return;
      }

      const selections = await selectionManager.getSelectionIds();

      // Only sync if there are actual Power BI selections and not too many
      // OR if there are no selections (to allow clearing)
      if (
        selections &&
        selections.length > 0 &&
        selections.length < data.length * 0.5
      ) {
        const newSelectedRows = new Set<string>();
        const mainCategories =
          dataView.categorical?.categories?.filter(
            (category) => category.source.roles?.category
          ) || [];

        if (mainCategories.length > 0) {
          const mainCategory = mainCategories[0];
          data.forEach((row, index) => {
            const selectionId = host
              ?.createSelectionIdBuilder()
              .withCategory(mainCategory, index)
              .createSelectionId();

            if (
              selections.some(
                (sel) => sel.toString() === selectionId.toString()
              )
            ) {
              newSelectedRows.add(getRowIdentifier(row));
            }
          });
        }

        // Don't sync if Power BI thinks most/all rows are selected (likely incorrect)
        if (newSelectedRows.size >= data.length * 0.9 && data.length > 1) {
          return;
        }

        setSelectedRows(newSelectedRows);
      } else if (
        selections &&
        selections.length === 0 &&
        selectedRows.size > 0
      ) {
        // Power BI has no selections but we have local selections - clear local
        setSelectedRows(new Set());
      }
      // Don't clear selections if there are no Power BI selections and we have none locally
      // This prevents the sync from clearing our local selections unnecessarily
    };

    syncSelections();
  }, [selectionManager, dataView, host]); // Removed data.length dependency

  const toggleRow = (rowId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Handle row selection
  const handleRowSelection = async (row: any, checked: boolean) => {
    // Set flag to prevent sync interference
    setIsUserSelecting(true);

    // Update local state first
    const rowId = getRowIdentifier(row);
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(rowId);
    } else {
      newSelectedRows.delete(rowId);
    }

    setSelectedRows(newSelectedRows);

    // Sync with Power BI immediately after state update
    setTimeout(async () => {
      if (selectionManager && dataView && host) {
        const mainCategories =
          dataView.categorical?.categories?.filter(
            (category) => category.source.roles?.category
          ) || [];

        if (mainCategories.length > 0) {
          const mainCategory = mainCategories[0];
          const currentSelections = Array.from(newSelectedRows); // Use the new state

          if (currentSelections.length > 0) {
            // Create selection IDs for all currently selected rows
            const selectionIds = currentSelections
              .map((rowId) => {
                const row = data.find((r) => getRowIdentifier(r) === rowId);
                if (row) {
                  const originalIndex = getOriginalDataIndex(row);
                  return host
                    .createSelectionIdBuilder()
                    .withCategory(mainCategory, originalIndex)
                    .createSelectionId();
                }
                return null;
              })
              .filter((id) => id !== null);

            if (selectionIds.length > 0) {
              await selectionManager.select(selectionIds, false);
            }
          } else {
            await selectionManager.clear();
          }
        }
      }
    }, 100); // Small delay to ensure state is updated

    // Reset the user selecting flag after a longer delay to cover scrolling
    setTimeout(() => {
      setIsUserSelecting(false);
    }, 500);
  };

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
    setVisibleRows(20); // Reset visible rows when sorting
  };

  // Filter and sort data
  const filteredData = searchTerm
    ? data.filter((row) => {
        const firstColumnKey = columns[0]?.accessorKey;
        if (!firstColumnKey) return true;
        const cellValue = String(row[firstColumnKey]).toLowerCase();
        const searchValue = searchTerm.toLowerCase();

        if (searchType === "contains") {
          return cellValue.includes(searchValue);
        } else {
          return cellValue === searchValue;
        }
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

  // Get visible data for infinite scroll
  const currentData = sortedData.slice(0, visibleRows);

  // Clear selections when data changes completely (different dataset)
  useEffect(() => {
    if (data.length > 0) {
      const firstRowId = getRowIdentifier(data[0]);
      const hasMatchingSelections = Array.from(selectedRows).some(
        (selectedId) => data.some((row) => getRowIdentifier(row) === selectedId)
      );

      // If none of the current selections match the new data, clear all selections
      if (selectedRows.size > 0 && !hasMatchingSelections) {
        setSelectedRows(new Set());

        // Also clear Power BI selections when data changes completely
        if (selectionManager) {
          selectionManager.clear();
        }
      }
    }
  }, [data, selectedRows]);

  // Create a stable identifier for each row using the first column value
  const getRowIdentifier = (row: any) => {
    const firstColumnKey = columns[0]?.accessorKey;
    if (firstColumnKey && row[firstColumnKey]) {
      return String(row[firstColumnKey]);
    }
    // Fallback: use all column values
    return columns.map((col) => String(row[col.accessorKey] || "")).join("|");
  };

  // Get original data index by finding the row in the original data
  const getOriginalDataIndex = (row: any) => {
    const index = data.findIndex((item) => item === row);
    return index;
  };

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      // Load more rows when user is near the bottom
      setVisibleRows((prev) => Math.min(prev + 20, sortedData.length));
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        ref={tableRef}
        style={{ flex: 1, overflow: "auto" }}
        onScroll={handleScroll}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "Arial, sans-serif",
            position: "relative",
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              backgroundColor: "#F6F6F6",
            }}
          >
            <tr>
              <th
                style={{
                  width: "40px",
                  padding: "12px 8px",
                  borderBottom: "1px solid #ddd",
                  backgroundColor: "#F6F6F6",
                  fontSize: "14px",
                  fontWeight: "bold",
                  fontFamily: "Arial, sans-serif",
                  textAlign: "center",
                }}
              >
                {/* Individual row selection column - no select all */}
              </th>
              {columns.map((column, index) => (
                <th
                  key={column.accessorKey}
                  style={{
                    padding: "12px 8px",
                    borderBottom: "1px solid #ddd",
                    backgroundColor: "#F6F6F6",
                    textAlign: index === 0 ? "left" : "center",
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
                      justifyContent: index === 0 ? "space-between" : "center",
                      width: "100%",
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
                          position: "relative",
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSearchMenu(!showSearchMenu);
                          }}
                          style={{
                            paddingTop: "4px",
                            fontSize: "18px",
                            border: "none",
                            backgroundColor: "transparent",
                            cursor: "pointer",
                          }}
                        >
                          {searchTerm ? <FaFilterCircleXmark /> : <IoFilter />}
                        </button>
                        {showSearchMenu && (
                          <div
                            ref={searchMenuRef}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: "-60px",
                              backgroundColor: "white",
                              border: "1px solid #e0e0e0",
                              borderRadius: "8px",
                              padding: "20px",
                              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                              zIndex: 10000,
                              minWidth: "320px",
                              fontFamily: "Roboto, Arial, sans-serif",
                              display: "flex",
                              flexDirection: "column",
                              gap: "20px",
                            }}
                          >
                            {/* Filter Controls - Operator and Value side by side */}
                            <div
                              style={{
                                display: "flex",
                                gap: "16px",
                                flexShrink: 0,
                              }}
                            >
                              {/* Operator Selection */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                  flex: 1,
                                  position: "relative",
                                }}
                              >
                                <label
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#666",
                                    display: "block",
                                    marginBottom: "6px",
                                  }}
                                >
                                  Operator
                                </label>
                                <div
                                  style={{
                                    position: "relative",
                                    borderBottom: "1px solid #e0e0e0",
                                    paddingBottom: "4px",
                                  }}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowOperatorDropdown(
                                        !showOperatorDropdown
                                      );
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "10px 0",
                                      border: "none",
                                      fontSize: "16px",
                                      backgroundColor: "transparent",
                                      outline: "none",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <span>{searchType}</span>
                                    <svg
                                      style={{
                                        width: "16",
                                        height: "16",
                                        transform: showOperatorDropdown
                                          ? "rotate(180deg)"
                                          : "rotate(0deg)",
                                        transition: "transform 0.2s",
                                      }}
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <path d="M7 10l5 5 5-5z" />
                                    </svg>
                                  </button>
                                  {showOperatorDropdown && (
                                    <div
                                      ref={operatorDropdownRef}
                                      style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        backgroundColor: "white",
                                        border: "1px solid #e0e0e0",
                                        borderRadius: "4px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                        zIndex: 10001,
                                        marginTop: "4px",
                                      }}
                                    >
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSearchType("contains");
                                          setShowOperatorDropdown(false);
                                        }}
                                        style={{
                                          padding: "10px 14px",
                                          cursor: "pointer",
                                          textAlign: "left",
                                          backgroundColor:
                                            searchType === "contains"
                                              ? "#f5f5f5"
                                              : "white",
                                          fontSize: "16px",
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "#f5f5f5";
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            searchType === "contains"
                                              ? "#f5f5f5"
                                              : "white";
                                        }}
                                      >
                                        contains
                                      </div>
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSearchType("equal");
                                          setShowOperatorDropdown(false);
                                        }}
                                        style={{
                                          padding: "10px 14px",
                                          cursor: "pointer",
                                          backgroundColor:
                                            searchType === "equal"
                                              ? "#f5f5f5"
                                              : "white",
                                          fontSize: "16px",
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "#f5f5f5";
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            searchType === "equal"
                                              ? "#f5f5f5"
                                              : "white";
                                        }}
                                      >
                                        equals
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Value Input */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                  flex: 2,
                                }}
                              >
                                <label
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#666",
                                    display: "block",
                                    marginBottom: "6px",
                                  }}
                                >
                                  Value
                                </label>
                                <div
                                  style={{
                                    position: "relative",
                                    borderBottom: "1px solid #e0e0e0",
                                    paddingBottom: "4px",
                                  }}
                                >
                                  <input
                                    type="text"
                                    value={searchTerm}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      setSearchTerm(e.target.value);
                                      setVisibleRows(20);
                                    }}
                                    placeholder="Filter value"
                                    style={{
                                      width: "100%",
                                      padding: "10px 0",
                                      border: "none",
                                      fontSize: "16px",
                                      backgroundColor: "transparent",
                                      outline: "none",
                                    }}
                                    onFocus={(e) => {
                                      e.target.parentElement!.style.borderBottomColor =
                                        "#1976d2";
                                    }}
                                    onBlur={(e) => {
                                      e.target.parentElement!.style.borderBottomColor =
                                        "#e0e0e0";
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
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
                  backgroundColor: "#F6F6F6",
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
              <React.Fragment key={index}>
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
                      checked={selectedRows.has(getRowIdentifier(row))}
                      onChange={(e) => {
                        handleRowSelection(row, e.target.checked);
                      }}
                      style={{
                        cursor: "pointer",
                        accentColor: "#22294d",
                        width: "16px",
                        height: "16px",
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
                              backgroundColor: isYes ? "#D4F8D3" : "#FFEABD",
                              color: "#222222",
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
                    onClick={() =>
                      toggleRow(getOriginalDataIndex(row).toString())
                    }
                  >
                    {expanded[getOriginalDataIndex(row).toString()] ? (
                      <IoIosArrowUp />
                    ) : (
                      <IoIosArrowDown />
                    )}
                  </td>
                </tr>
                {expanded[getOriginalDataIndex(row).toString()] && (
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
    </div>
  );
};
