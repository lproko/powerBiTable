/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
"use strict";

import React from "react";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import { createRoot } from "react-dom/client";
import { Table } from "./components/Table";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
  private target: HTMLElement;
  private formattingSettings: VisualFormattingSettingsModel;
  private formattingSettingsService: FormattingSettingsService;
  private root: any;
  private host: powerbi.extensibility.visual.IVisualHost;
  private selectionManager: powerbi.extensibility.ISelectionManager;
  private previousDataLength: number = 0;
  private lastFixAttemptTime: number = 0;

  constructor(options: VisualConstructorOptions) {
    this.formattingSettingsService = new FormattingSettingsService();
    this.target = options.element;
    this.host = options.host;

    // Initialize selection manager
    this.selectionManager = this.host.createSelectionManager();

    // Create a container for React
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    this.target.appendChild(container);

    // Initialize React root
    this.root = createRoot(container);
  }

  public async update(options: VisualUpdateOptions) {
    this.formattingSettings =
      this.formattingSettingsService.populateFormattingSettingsModel(
        VisualFormattingSettingsModel,
        options.dataViews[0]
      );

    // Get data from Power BI
    // Check if multiple dataViews are available (sometimes Power BI provides filtered and unfiltered)
    let dataView = options.dataViews[0];

    // If we have multiple dataViews, log them for debugging
    if (options.dataViews && options.dataViews.length > 1) {
      // Use the first dataView (typically the full/unfiltered one if available)
      dataView = options.dataViews[0];
    }

    if (!dataView || !dataView.categorical) {
      return;
    }

    // Get categories and separate them into main and nested based on roles
    const categories = dataView.categorical.categories || [];

    // Separate categories based on roles
    const mainCategories = categories.filter(
      (category) => category.source.roles?.category
    );
    const nestedCategories = categories.filter(
      (category) => category.source.roles?.nested
    );
    const nestedTableCategories = categories.filter(
      (category) => category.source.roles?.nestedTable
    );
    const nestedTableNestedCategories = categories.filter(
      (category) => category.source.roles?.nestedTableNested
    );

    // Validate that we have data - if main categories exist but have suspiciously few values,
    // it might indicate a filtered context issue
    if (mainCategories.length > 0) {
      const firstMainCategory = mainCategories[0];
      const valueCount = firstMainCategory.values?.length || 0;

      // If we only have 1 row when we should have more, this might be a filtered dataView issue
      // Check if all categories have the same count (they should)
      const allCategoryCounts = mainCategories.map(
        (cat) => cat.values?.length || 0
      );
      const allCountsMatch = allCategoryCounts.every(
        (count) => count === valueCount
      );

      if (valueCount === 1 && mainCategories.length > 0) {
        console.warn(
          "Only 1 row detected - this might indicate a filtered dataView. All category counts:",
          allCategoryCounts
        );
      }
    }

    // Ensure the first column title exists; otherwise, render an error and skip
    const firstMainCategoryDisplayName = mainCategories[0]?.source?.displayName;
    if (
      firstMainCategoryDisplayName === undefined ||
      String(firstMainCategoryDisplayName).trim() === ""
    ) {
      this.root.render(
        <div
          style={{
            padding: "16px",
            color: "#721c24",
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
      return;
    }

    // Transform main data
    const columns = mainCategories.map((category) => ({
      header: category.source.displayName,
      accessorKey: category.source.displayName,
    }));

    // Secondary guard: if columns are missing or first column title is empty, show error and exit
    if (
      columns.length === 0 ||
      columns[0] === undefined ||
      String(columns[0].header ?? "").trim() === ""
    ) {
      this.root.render(
        <div
          style={{
            padding: "16px",
            color: "#721c24",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          The first column title is required. Please add a field to the Category
          role or provide a non-empty title to display the table.
        </div>
      );
      return;
    }

    let data = this.transformData(mainCategories);

    // Get the main key for filtering and validation
    const mainKey = mainCategories[0].source.displayName;

    // Filter out rows with empty first column values before validation
    // This handles cases where related table data might create empty rows
    data = data.filter((row) => {
      const value = row?.[mainKey];
      return (
        value !== null && value !== undefined && String(value).trim() !== ""
      );
    });

    // If we filtered out all rows, show error
    if (data.length === 0) {
      this.root.render(
        <div
          style={{
            padding: "16px",
            color: "#721c24",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          No valid data rows found. Please ensure the first column has values.
        </div>
      );
      return;
    }

    // Deduplicate main table data by the main key
    // When Power BI expands related table data, it creates duplicate rows
    // We want to show each pest only once in the main table
    const originalDataLength = data.length;
    const seenKeys = new Set<string>();
    const uniqueData: any[] = [];

    data.forEach((row) => {
      const key = String(row[mainKey] ?? "");
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueData.push(row);
      }
    });

    // Use the deduplicated data for the main table
    data = uniqueData;

    console.log("Data deduplication:", {
      originalRowCount: originalDataLength,
      uniqueRowCount: uniqueData.length,
      duplicatesRemoved: originalDataLength - uniqueData.length,
    });

    // Detect if we're getting an unusually small dataset after having more data
    // This can happen when filters are reset but cross-filtering or selections are still active
    const currentDataLength = data.length;

    // Only check and potentially fix if we had significantly more data before
    // and now we have only 1 row (which is suspicious)
    // Also prevent the fix from running too frequently (within 2 seconds)
    const now = Date.now();
    const timeSinceLastFix = now - this.lastFixAttemptTime;

    if (
      this.previousDataLength > 10 && // Had a reasonable amount of data before
      currentDataLength === 1 && // Now only have 1 row
      this.previousDataLength !== currentDataLength && // Data actually changed
      timeSinceLastFix > 2000 // Haven't tried to fix recently (prevents loops)
    ) {
      console.warn(
        `Data length dropped from ${this.previousDataLength} to ${currentDataLength}. This might indicate a filtered dataView. Checking for residual selections.`
      );

      // Mark that we're attempting a fix
      this.lastFixAttemptTime = now;

      // Check for and clear any active selections that might be causing the filtering
      try {
        const currentSelections = await this.selectionManager.getSelectionIds();
        if (currentSelections && currentSelections.length > 0) {
          await this.selectionManager.clear();
          // Note: This will trigger another update() call, so we'll process the data again
          // For now, we'll still render with the current data to avoid flickering
        } else {
        }
      } catch (error) {
        console.error("Error checking/clearing selections:", error);
      }
    }

    // Update previous data length (but only if we're not in the middle of fixing the issue)
    // This prevents the fix from being triggered repeatedly
    if (currentDataLength !== 1 || this.previousDataLength <= 10) {
      this.previousDataLength = currentDataLength;
    }

    // Transform nested data
    const nestedColumns = nestedCategories.map((category) => ({
      header: category.source.displayName,
      accessorKey: category.source.displayName,
    }));

    // Transform nested table columns
    const nestedTableColumns = nestedTableCategories.map((category) => ({
      header: category.source.displayName,
      accessorKey: category.source.displayName,
    }));

    // Transform nested table nested columns
    const nestedTableNestedColumns = nestedTableNestedCategories.map(
      (category) => ({
        header: category.source.displayName,
        accessorKey: category.source.displayName,
      })
    );

    // Create a map of parent row identifiers to nested data
    const nestedDataMap = new Map();

    // Create a map of parent row identifiers to nested table data
    const nestedTableDataMap = new Map();

    // Create a map for nested table nested columns data
    // Key: nested table row key (e.g., PUBID), Value: array of nested column rows
    const nestedTableNestedDataMap = new Map<string, any[]>();

    // Use the first main category (e.g., Pest) as the key for matching
    // Note: mainKey is already defined above

    // Create nested data entries
    // Process all rows, but only add to map if the main value is valid (matches filtered data)
    const validMainKeys = new Set(
      data.map((row) => String(row[mainKey] ?? ""))
    );
    const processedNestedKeys = new Set<string>(); // Track which keys we've already processed for nested columns

    mainCategories[0].values.forEach((mainValue, index) => {
      const key = String(mainValue ?? "");

      // Only process if this key is in our filtered data
      if (!validMainKeys.has(key)) {
        return; // Skip rows with empty/invalid main keys
      }

      // For nested columns, only process the first occurrence of each key to avoid duplicates
      // (since nested columns are typically the same for all rows with the same pest name)
      if (!processedNestedKeys.has(key)) {
        processedNestedKeys.add(key);

        const nestedRow = {};

        // Add main category values for reference
        mainCategories.forEach((category) => {
          nestedRow[category.source.displayName] = category.values[index];
        });

        // Add nested category values
        nestedCategories.forEach((category) => {
          nestedRow[category.source.displayName] = category.values[index];
        });

        // Use the main value as key to group nested data
        nestedDataMap.set(key, [nestedRow]);
      }
    });

    // Process nested table data separately
    // When data comes from a related table, Power BI expands the data
    // We need to match based on the relationship key (e.g., PestName)
    if (nestedTableCategories.length > 0) {
      const mainCategoryLength = mainCategories[0]?.values?.length || 0;
      const nestedTableCategoryLength =
        nestedTableCategories[0]?.values?.length || 0;

      console.log("Nested table processing:", {
        mainCategoryLength,
        nestedTableCategoryLength,
        mainKey,
        nestedTableColumnNames: nestedTableCategories.map(
          (c) => c.source.displayName
        ),
        nestedTableSourceTables: nestedTableCategories.map(
          (c) => c.source?.queryName || c.source?.displayName
        ),
      });

      // Strategy: Always use relationship key matching for nested table data
      // The relationship key should match the mainKey (e.g., "PestName")
      // This works whether data comes from same table or related table
      const relationshipKeyName = mainKey;

      // Check if any nested table category matches the relationship key name
      // Try exact match first, then case-insensitive, then check if it's in the source table name
      let relationshipCategoryIndex = nestedTableCategories.findIndex(
        (cat) => cat.source.displayName === relationshipKeyName
      );

      // If not found, try case-insensitive match
      if (relationshipCategoryIndex < 0) {
        relationshipCategoryIndex = nestedTableCategories.findIndex(
          (cat) =>
            cat.source.displayName?.toLowerCase() ===
            relationshipKeyName.toLowerCase()
        );
      }

      // If still not found, check if the main key value appears in any nested table row
      // by comparing values from the first main category with nested table values
      console.log("Relationship matching:", {
        relationshipKeyName,
        relationshipCategoryIndex,
        foundInNestedTable: relationshipCategoryIndex >= 0,
        nestedTableColumnNames: nestedTableCategories.map(
          (c) => c.source.displayName
        ),
      });

      // Process all nested table rows
      // When lengths match, Power BI has expanded the data - each main row is repeated for each related row
      // We need to match by getting the main key value at each index
      for (let i = 0; i < nestedTableCategoryLength; i++) {
        const nestedTableRow = {};
        let relationshipValue = null;

        // Add nested table category values
        nestedTableCategories.forEach((category) => {
          const value = category.values[i];
          nestedTableRow[category.source.displayName] = value;
        });

        // Get the relationship value - this is the key to match with main table rows
        if (relationshipCategoryIndex >= 0) {
          // Found a column that matches the relationship key name (e.g., PestName in Publications table)
          relationshipValue =
            nestedTableCategories[relationshipCategoryIndex].values[i];
        } else {
          // Relationship key column not found in nested table
          // When lengths match, Power BI has expanded the data - use the main category value at this index
          // This matches each nested table row to its corresponding main table row
          if (i < mainCategoryLength) {
            relationshipValue = mainCategories[0].values[i];
          }
        }

        // Use the relationship value as the key to match with main table rows
        const key =
          relationshipValue != null ? String(relationshipValue) : null;

        // Only add if we have a valid key (skip null/undefined/empty)
        // Also check if this key is in our filtered valid data
        if (key && key !== "null" && key !== "undefined" && key.trim() !== "") {
          // Only add if the key exists in our filtered data
          if (validMainKeys.has(key)) {
            if (!nestedTableDataMap.has(key)) {
              nestedTableDataMap.set(key, []);
            }
            nestedTableDataMap.get(key).push(nestedTableRow);
          }
        }
      }

      // Log detailed information about the matching
      const keysArray = Array.from(nestedTableDataMap.keys());
      const rowsPerKey = Array.from(nestedTableDataMap.entries()).map(
        ([key, rows]) => ({
          key,
          count: rows.length,
        })
      );

      console.log("Nested table data map:", {
        totalKeys: keysArray.length,
        totalRows: Array.from(nestedTableDataMap.values()).reduce(
          (sum, arr) => sum + arr.length,
          0
        ),
        validMainKeysCount: validMainKeys.size,
        sampleKeys: keysArray.slice(0, 5),
        rowsPerKeySample: rowsPerKey.slice(0, 10),
      });

      // Check if we're missing any valid main keys
      const missingKeys = Array.from(validMainKeys).filter(
        (key) => !nestedTableDataMap.has(key)
      );
      if (missingKeys.length > 0) {
        console.warn(
          "Some valid main keys have no nested table data:",
          missingKeys.slice(0, 10)
        );
      }

      // Process nested table nested columns data
      // Group by the nested table's first column (e.g., PUBID)
      if (
        nestedTableNestedCategories.length > 0 &&
        nestedTableCategories.length > 0
      ) {
        const nestedTableFirstColumnName =
          nestedTableCategories[0].source.displayName;
        const nestedTableNestedCategoryLength =
          nestedTableNestedCategories[0]?.values?.length || 0;
        const nestedTableCategoryLength =
          nestedTableCategories[0]?.values?.length || 0;

        console.log("Processing nested table nested columns:", {
          nestedTableFirstColumnName,
          nestedTableNestedCategoryLength,
          nestedTableCategoryLength,
          nestedTableNestedColumnNames: nestedTableNestedCategories.map(
            (c) => c.source.displayName
          ),
        });

        // Check if nested table nested categories have the same length as nested table categories
        // If they match, use index-based matching (data is aligned)
        // If they don't match, we need to match by the relationship key
        if (nestedTableNestedCategoryLength === nestedTableCategoryLength) {
          // Lengths match - data is aligned by index
          // Process and group by the nested table's first column value at each index
          const processedNestedTableNestedKeys = new Set<string>();

          for (let i = 0; i < nestedTableNestedCategoryLength; i++) {
            // Get the nested table row key from the nested table categories at this index
            const nestedTableRowKey =
              nestedTableCategories[0].values[i] != null
                ? String(nestedTableCategories[0].values[i])
                : null;

            if (
              !nestedTableRowKey ||
              nestedTableRowKey === "null" ||
              nestedTableRowKey === "undefined" ||
              nestedTableRowKey.trim() === ""
            ) {
              continue;
            }

            // Only process the first occurrence of each key to avoid duplicates
            if (!processedNestedTableNestedKeys.has(nestedTableRowKey)) {
              processedNestedTableNestedKeys.add(nestedTableRowKey);

              const nestedTableNestedRow = {};

              // Add nested table nested category values
              nestedTableNestedCategories.forEach((category) => {
                const value = category.values[i];
                nestedTableNestedRow[category.source.displayName] = value;
              });

              // Group by the nested table row key
              nestedTableNestedDataMap.set(nestedTableRowKey, [
                nestedTableNestedRow,
              ]);
            }
          }
        } else {
          // Different lengths - need to match by relationship key
          // Look for the nested table's first column in nested table nested categories
          const nestedTableKeyIndex = nestedTableNestedCategories.findIndex(
            (cat) => cat.source.displayName === nestedTableFirstColumnName
          );

          // Process all nested table nested column rows
          for (let i = 0; i < nestedTableNestedCategoryLength; i++) {
            const nestedTableNestedRow = {};
            let nestedTableRowKey = null;

            // Add nested table nested category values
            nestedTableNestedCategories.forEach((category) => {
              const value = category.values[i];
              nestedTableNestedRow[category.source.displayName] = value;

              // Check if this is the nested table's first column (the key)
              if (category.source.displayName === nestedTableFirstColumnName) {
                nestedTableRowKey = value != null ? String(value) : null;
              }
            });

            // If we didn't find the key in nested table nested categories, skip this row
            if (!nestedTableRowKey) {
              continue;
            }

            // Group by the nested table row key
            if (
              nestedTableRowKey !== "null" &&
              nestedTableRowKey !== "undefined" &&
              nestedTableRowKey.trim() !== ""
            ) {
              if (!nestedTableNestedDataMap.has(nestedTableRowKey)) {
                nestedTableNestedDataMap.set(nestedTableRowKey, []);
              }
              nestedTableNestedDataMap
                .get(nestedTableRowKey)!
                .push(nestedTableNestedRow);
            }
          }
        }

        console.log("Nested table nested columns processing:", {
          nestedTableFirstColumnName,
          nestedTableNestedCategoryLength,
          totalKeys: Array.from(nestedTableNestedDataMap.keys()).length,
          totalRows: Array.from(nestedTableNestedDataMap.values()).reduce(
            (sum, arr) => sum + arr.length,
            0
          ),
          sampleKeys: Array.from(nestedTableNestedDataMap.keys()).slice(0, 5),
        });
      }
    }

    // Function to get nested data for a row
    const getNestedDataForRow = (row: any) => {
      const key = String(row[mainKey] ?? "");
      const nestedData = nestedDataMap.get(key) || [];

      return nestedData;
    };

    // Function to get nested table data for a row
    const getNestedTableDataForRow = (row: any) => {
      const key = String(row[mainKey] ?? "");
      const nestedTableData = nestedTableDataMap.get(key) || [];

      return nestedTableData;
    };

    // Function to get nested table nested columns data for a nested table row
    // This will be called from within the nested table component
    const getNestedTableNestedDataForRow = (nestedTableRow: any) => {
      if (
        nestedTableColumns.length === 0 ||
        nestedTableNestedColumns.length === 0
      ) {
        return [];
      }

      // Use the first column of the nested table as the key (e.g., PUBID)
      const nestedTableKey = nestedTableColumns[0].accessorKey;
      const key = String(nestedTableRow[nestedTableKey] ?? "");
      const nestedTableNestedData = nestedTableNestedDataMap.get(key) || [];

      console.log("Getting nested table nested columns for row:", {
        nestedTableKey,
        key,
        rowData: nestedTableRow,
        foundData: nestedTableNestedData.length,
        allKeys: Array.from(nestedTableNestedDataMap.keys()).slice(0, 5),
      });

      return nestedTableNestedData;
    };

    // Get current selections
    const selections = await this.selectionManager.getSelectionIds();

    // Render the table
    this.root.render(
      <Table
        columns={columns}
        data={data}
        nestedData={getNestedDataForRow}
        nestedColumns={nestedColumns}
        nestedTableData={
          nestedTableCategories.length > 0
            ? getNestedTableDataForRow
            : undefined
        }
        nestedTableColumns={
          nestedTableColumns.length > 0 ? nestedTableColumns : undefined
        }
        nestedTableNestedData={
          nestedTableNestedCategories.length > 0
            ? getNestedTableNestedDataForRow
            : undefined
        }
        nestedTableNestedColumns={
          nestedTableNestedColumns.length > 0
            ? nestedTableNestedColumns
            : undefined
        }
        selectionManager={this.selectionManager}
        dataView={dataView}
        host={this.host}
      />
    );
  }

  private transformData(categories: powerbi.DataViewCategoryColumn[]): any[] {
    const rows: any[] = [];

    if (categories.length === 0) return rows;

    const rowCount = categories[0].values.length;

    for (let i = 0; i < rowCount; i++) {
      const row: any = {};
      categories.forEach((category) => {
        row[category.source.displayName] = category.values[i];
      });
      rows.push(row);
    }

    return rows;
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(
      this.formattingSettings
    );
  }
}
