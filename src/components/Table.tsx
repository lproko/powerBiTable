import React, { useState, useRef, useEffect } from "react";
import powerbi from "powerbi-visuals-api";
import { IoFilter } from "react-icons/io5";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { FaFilterCircleXmark } from "react-icons/fa6";

// Helper function to check if a string is a URL
const isUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Link icon SVG - inline SVG for reliability
const LinkIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline-block", verticalAlign: "middle" }}
  >
    <path
      d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6466 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.4791 3.53087C19.5521 2.60383 18.298 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.47L11.75 5.18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 11C13.5705 10.4259 13.0226 9.95085 12.3934 9.60707C11.7643 9.26329 11.0685 9.05886 10.3534 9.00766C9.63821 8.95645 8.92037 9.05972 8.24865 9.31026C7.57694 9.5608 6.96687 9.95302 6.46 10.46L3.46 13.46C2.54918 14.403 2.04519 15.6661 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.44791 21.3962 5.70198 21.922 7.01296 21.9334C8.32394 21.9448 9.58695 21.4408 10.53 20.53L12.24 18.82"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
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
  nestedTableData?: (row: any) => any[];
  nestedTableColumns?: {
    header: string;
    accessorKey: string;
  }[];
  nestedTableNestedData?: (row: any) => any[];
  nestedTableNestedColumns?: {
    header: string;
    accessorKey: string;
  }[];
  selectionManager?: powerbi.extensibility.ISelectionManager;
  dataView?: powerbi.DataView;
  host?: powerbi.extensibility.visual.IVisualHost;
  isNestedTable?: boolean;
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

// SVG Image Cell component with error handling
const SvgImageCell: React.FC<{ url: string }> = ({ url }) => {
  const [imageError, setImageError] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Reset state when URL changes
  useEffect(() => {
    setImageError(false);
    setSvgContent(null);
    setIsLoading(false);
    setFetchAttempted(false);
  }, [url]);

  // Try to fetch SVG content proactively as a backup (only once per URL)
  useEffect(() => {
    if (!svgContent && !isLoading && !fetchAttempted && url) {
      setIsLoading(true);
      setFetchAttempted(true);
      fetch(url)
        .then((response) => {
          if (response.ok) {
            return response.text();
          }
          throw new Error("Failed to fetch SVG");
        })
        .then((text) => {
          setSvgContent(text);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
          // Don't retry - mark as attempted and failed
        });
    }
  }, [url, svgContent, isLoading, fetchAttempted]);

  // If we have SVG content, render it inline
  if (svgContent) {
    // Parse and modify SVG to ensure proper sizing
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      const svgElement = svgDoc.documentElement;

      // Set size attributes if not present
      if (!svgElement.getAttribute("width")) {
        svgElement.setAttribute("width", "16");
      }
      if (!svgElement.getAttribute("height")) {
        svgElement.setAttribute("height", "16");
      }
      svgElement.setAttribute(
        "style",
        "max-width: 100%; max-height: 24px; width: auto; height: auto;"
      );

      const modifiedSvg = new XMLSerializer().serializeToString(svgElement);

      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: "100%",
            maxHeight: "24px",
            verticalAlign: "middle",
          }}
          dangerouslySetInnerHTML={{ __html: modifiedSvg }}
        />
      );
    } catch (e) {
      // If parsing fails, just render the original content
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: "100%",
            maxHeight: "24px",
            verticalAlign: "middle",
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      );
    }
  }

  // If we have SVG content, prefer it (already handled above)
  // Otherwise, try to show as image
  // If image failed and we don't have SVG content yet, show nothing while loading
  if (imageError && !svgContent && isLoading) {
    return null; // Still loading, show nothing
  }

  // If image failed and we don't have SVG content, show nothing
  if (imageError && !svgContent) {
    return null; // Don't show the URL string, just show nothing
  }

  // Try to render as image (will fallback to SVG content if image fails)
  return (
    <img
      src={url}
      alt=""
      style={{
        maxWidth: "100%",
        maxHeight: "24px",
        width: "auto",
        height: "auto",
        display: "inline-block",
        verticalAlign: "middle",
      }}
      onError={() => {
        setImageError(true);
        // If image fails and we have SVG content, it will re-render with SVG
      }}
      onLoad={() => {
        setImageError(false);
      }}
    />
  );
};

// Nested table component - renders nested columns as key-value pairs and nested table as full table
const NestedTable: React.FC<{
  rowData: any;
  nestedData: any[] | ((row: any) => any[]);
  nestedColumns?: {
    header: string;
    accessorKey: string;
  }[];
  nestedTableData?: (row: any) => any[];
  nestedTableColumns?: {
    header: string;
    accessorKey: string;
  }[];
  nestedTableNestedData?: (row: any) => any[];
  nestedTableNestedColumns?: {
    header: string;
    accessorKey: string;
  }[];
  selectionManager?: powerbi.extensibility.ISelectionManager;
  dataView?: powerbi.DataView;
  host?: powerbi.extensibility.visual.IVisualHost;
}> = ({
  rowData,
  nestedData: nestedDataProp,
  nestedColumns,
  nestedTableData,
  nestedTableColumns,
  nestedTableNestedData,
  nestedTableNestedColumns,
  selectionManager,
  dataView,
  host,
}) => {
  // Get the actual nested data
  const actualNestedData =
    typeof nestedDataProp === "function"
      ? nestedDataProp(rowData)
      : nestedDataProp;

  // Get nested table data if available
  const actualNestedTableData = nestedTableData ? nestedTableData(rowData) : [];

  // Check if we have both nested columns and nested table
  const hasNestedColumns =
    nestedColumns && actualNestedData && actualNestedData.length > 0;
  const hasNestedTable =
    nestedTableColumns &&
    actualNestedTableData &&
    actualNestedTableData.length > 0;

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "white",
        margin: "0 16px",
        display: "flex",
        gap: "24px",
        alignItems: "flex-start",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Render nested columns as key-value pairs - 2 columns layout */}
      {hasNestedColumns && (
        <div
          style={{
            width: hasNestedTable ? "40%" : "100%",
            flexShrink: 0,
            maxWidth: hasNestedTable ? "40%" : "100%",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {actualNestedData.map((item, index) => (
            <div key={index} style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                {nestedColumns.map((column, colIndex) => {
                  const cellValue = item[column.accessorKey];
                  const cellValueStr = String(cellValue || "");
                  const isYes = cellValueStr.toLowerCase() === "yes";
                  const isNo = cellValueStr.toLowerCase() === "no";
                  const isSvgUrl =
                    colIndex > 0 &&
                    cellValueStr.startsWith(
                      "https://raw.githubusercontent.com/hypertechsa"
                    );

                  return (
                    <div
                      key={column.accessorKey}
                      style={{ marginBottom: "16px" }}
                    >
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
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {colIndex === 0 ? (
                          // First column: show text as is
                          cellValue
                        ) : isSvgUrl ? (
                          // If it's an SVG URL, show the image
                          <SvgImageCell url={cellValueStr} />
                        ) : isYes ? (
                          // If text is "Yes", apply Yes styling
                          <span
                            style={{
                              backgroundColor: "#EAEAEA",
                              color: "#222222",
                              width: "44px",
                              height: "22px",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontWeight: "500",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "Arial, sans-serif",
                              boxSizing: "border-box",
                            }}
                          >
                            {cellValue}
                          </span>
                        ) : isNo ? (
                          // If text is "No", apply No styling
                          <span
                            style={{
                              backgroundColor: "#22294B",
                              color: "#FFFFFF",
                              width: "40px",
                              height: "22px",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontWeight: "500",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "Arial, sans-serif",
                              boxSizing: "border-box",
                            }}
                          >
                            {cellValue}
                          </span>
                        ) : (
                          // Otherwise, show text as is
                          cellValue
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render nested table as full table component - 50% width */}
      {hasNestedTable &&
        (() => {
          // Filter out rows with empty first column values
          const firstColumnKey = nestedTableColumns[0]?.accessorKey;
          const filteredNestedTableData = firstColumnKey
            ? actualNestedTableData.filter((row) => {
                const value = row?.[firstColumnKey];
                return (
                  value !== null &&
                  value !== undefined &&
                  String(value).trim() !== ""
                );
              })
            : actualNestedTableData;

          // Only render if we have valid data after filtering
          if (filteredNestedTableData.length === 0) {
            return null;
          }

          return (
            <div
              style={{
                width: hasNestedColumns ? "50%" : "100%",
                flexShrink: 0,
                maxWidth: hasNestedColumns ? "50%" : "100%",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              <Table
                columns={nestedTableColumns}
                data={filteredNestedTableData}
                nestedData={nestedTableNestedData || (() => [])} // Nested tables can have nested columns
                nestedColumns={nestedTableNestedColumns} // Nested tables can have nested columns
                nestedTableData={undefined} // Prevent recursion - nested tables cannot have nested tables
                nestedTableColumns={undefined}
                nestedTableNestedData={undefined} // Prevent recursion - nested tables cannot have nested table nested columns
                nestedTableNestedColumns={undefined}
                selectionManager={selectionManager}
                dataView={dataView}
                host={host}
                isNestedTable={true}
              />
            </div>
          );
        })()}
    </div>
  );
};

export const Table: React.FC<TableProps> = ({
  columns,
  data,
  nestedData,
  nestedColumns,
  nestedTableData,
  nestedTableColumns,
  nestedTableNestedData,
  nestedTableNestedColumns,
  selectionManager,
  dataView,
  host,
  isNestedTable = false,
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

  // Guard: if the first column title is empty, show an error and do not render the table
  const firstColumnHeader = columns?.[0]?.header;
  const isFirstColumnTitleEmpty =
    firstColumnHeader === undefined || String(firstColumnHeader).trim() === "";
  if (isFirstColumnTitleEmpty) {
    return (
      <div
        style={{
          padding: "16px",
          backgroundColor: "#f8d7da",
          border: "1px solid #f5c6cb",
          borderRadius: "4px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        The first column title is required. Please provide a title to display
        the table.
      </div>
    );
  }

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

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  };

  if (isNestedTable) {
    containerStyle.border = "1px solid #e0e0e0";
    containerStyle.borderRadius = "4px";
    containerStyle.backgroundColor = "#fafafa";
  }

  return (
    <div style={containerStyle}>
      <div
        ref={tableRef}
        style={{ flex: 1, overflow: "auto" }}
        onScroll={handleScroll}
      >
        <table
          style={{
            width: "100%",
            maxWidth: "100%",
            borderCollapse: "collapse",
            fontFamily: "Arial, sans-serif",
            position: "relative",
            ...(isNestedTable ? {} : { tableLayout: "fixed" }),
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
              {/* Show expand column if has nested data/columns (root table) or nested columns (nested table) */}
              {((!isNestedTable && (nestedColumns || nestedTableColumns)) ||
                (isNestedTable && nestedColumns)) && (
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
              )}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <React.Fragment key={index}>
                <tr>
                  {columns.map((column, columnIndex) => {
                    const cellValue = row[column.accessorKey];
                    const cellValueStr = String(cellValue || "");
                    const isYes = cellValueStr.toLowerCase() === "yes";
                    const isNo = cellValueStr.toLowerCase() === "no";

                    // Check if the value is a URL from the specified domain
                    const isSvgUrl =
                      columnIndex > 0 &&
                      cellValueStr.startsWith(
                        "https://raw.githubusercontent.com/hypertechsa"
                      );

                    // Check if the value is a URL (for nested tables)
                    const cellIsUrl = isNestedTable && isUrl(cellValueStr);

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
                        {columnIndex === 0 ? (
                          // First column: show text as is
                          cellValue
                        ) : cellIsUrl ? (
                          // For nested tables: if it's a URL, show clickable link icon
                          <a
                            href={cellValueStr}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              textDecoration: "none",
                              color: "#0078d4",
                            }}
                            title={cellValueStr}
                          >
                            <LinkIcon size={16} />
                          </a>
                        ) : isSvgUrl ? (
                          // For columns after the first: if it's an SVG URL, show the image
                          <SvgImageCell url={cellValueStr} />
                        ) : isYes ? (
                          // If text is "Yes", apply Yes styling
                          <span
                            style={{
                              backgroundColor: "#EAEAEA",
                              color: "#222222",
                              width: "44px",
                              height: "22px",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontWeight: "500",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "Arial, sans-serif",
                              boxSizing: "border-box",
                            }}
                          >
                            {cellValue}
                          </span>
                        ) : isNo ? (
                          // If text is "No", apply No styling
                          <span
                            style={{
                              backgroundColor: "#22294B",
                              color: "#FFFFFF",
                              width: "40px",
                              height: "22px",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontWeight: "500",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "Arial, sans-serif",
                              boxSizing: "border-box",
                            }}
                          >
                            {cellValue}
                          </span>
                        ) : (
                          // Otherwise, show text as is
                          cellValue
                        )}
                      </td>
                    );
                  })}
                  {/* Show expand column if has nested data/columns (root table) or nested columns (nested table) */}
                  {((!isNestedTable && (nestedColumns || nestedTableColumns)) ||
                    (isNestedTable && nestedColumns)) && (
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
                  )}
                </tr>
                {/* Root table: show nested columns and nested table */}
                {!isNestedTable &&
                  expanded[getOriginalDataIndex(row).toString()] && (
                    <tr>
                      <td
                        colSpan={
                          columns.length +
                          (nestedColumns || nestedTableColumns ? 1 : 0)
                        }
                        style={{
                          padding: 0,
                          width: "100%",
                          maxWidth: "100%",
                          overflow: "hidden",
                          boxSizing: "border-box",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            overflow: "hidden",
                            boxSizing: "border-box",
                          }}
                        >
                          <NestedTable
                            rowData={row}
                            nestedData={nestedData}
                            nestedColumns={nestedColumns}
                            nestedTableData={nestedTableData}
                            nestedTableColumns={nestedTableColumns}
                            nestedTableNestedData={nestedTableNestedData}
                            nestedTableNestedColumns={nestedTableNestedColumns}
                            selectionManager={selectionManager}
                            dataView={dataView}
                            host={host}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                {/* Nested table: show nested columns only (no nested tables) */}
                {isNestedTable &&
                  nestedColumns &&
                  expanded[getOriginalDataIndex(row).toString()] && (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        style={{
                          padding: "24px",
                          backgroundColor: "#fafafa",
                          borderTop: "1px solid #e0e0e0",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: "16px",
                            width: "100%",
                          }}
                        >
                          {(() => {
                            const rowNestedData =
                              typeof nestedData === "function"
                                ? nestedData(row)
                                : nestedData || [];

                            // If no nested data for this row, return empty
                            if (!rowNestedData || rowNestedData.length === 0) {
                              return null;
                            }

                            return rowNestedData.map(
                              (item: any, itemIndex: number) =>
                                nestedColumns.map((column, colIndex) => {
                                  const cellValue = item[column.accessorKey];
                                  const cellValueStr = String(cellValue || "");
                                  const isYes =
                                    cellValueStr.toLowerCase() === "yes";
                                  const isNo =
                                    cellValueStr.toLowerCase() === "no";
                                  const isSvgUrl =
                                    colIndex > 0 &&
                                    cellValueStr.startsWith(
                                      "https://raw.githubusercontent.com/hypertechsa"
                                    );

                                  return (
                                    <div
                                      key={`${itemIndex}-${column.accessorKey}`}
                                      style={{
                                        marginBottom: "16px",
                                        width: "100%",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: "14px",
                                          fontWeight: "bold",
                                          color: "#495057",
                                          marginBottom: "4px",
                                          fontFamily: "Arial, sans-serif",
                                          width: "100%",
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
                                          display: "flex",
                                          alignItems: "center",
                                          width: "100%",
                                        }}
                                      >
                                        {colIndex === 0 ? (
                                          cellValue
                                        ) : isSvgUrl ? (
                                          <SvgImageCell url={cellValueStr} />
                                        ) : isYes ? (
                                          <span
                                            style={{
                                              backgroundColor: "#EAEAEA",
                                              color: "#222222",
                                              width: "44px",
                                              height: "22px",
                                              padding: "4px 12px",
                                              borderRadius: "6px",
                                              fontWeight: "500",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontFamily: "Arial, sans-serif",
                                              boxSizing: "border-box",
                                            }}
                                          >
                                            {cellValue}
                                          </span>
                                        ) : isNo ? (
                                          <span
                                            style={{
                                              backgroundColor: "#22294B",
                                              color: "#FFFFFF",
                                              width: "40px",
                                              height: "22px",
                                              padding: "4px 12px",
                                              borderRadius: "6px",
                                              fontWeight: "500",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontFamily: "Arial, sans-serif",
                                              boxSizing: "border-box",
                                            }}
                                          >
                                            {cellValue}
                                          </span>
                                        ) : (
                                          cellValue
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                            );
                          })()}
                        </div>
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
