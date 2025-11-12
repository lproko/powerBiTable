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

    const data = this.transformData(mainCategories);

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

    // Create a map of parent row identifiers to nested data
    const nestedDataMap = new Map();

    // Use the first main category (e.g., Pest) as the key for matching
    const mainKey = mainCategories[0].source.displayName;

    // Validate that the first column has no empty/null values
    const hasEmptyInFirstColumn = data.some((row) => {
      const value = row?.[mainKey];
      return (
        value === null || value === undefined || String(value).trim() === ""
      );
    });
    if (hasEmptyInFirstColumn) {
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
          The first column contains empty values. Please ensure all titles are
          populated before rendering the table.
        </div>
      );
      return;
    }

    // Create nested data entries
    mainCategories[0].values.forEach((mainValue, index) => {
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
      const key = String(mainValue ?? "");
      if (!nestedDataMap.has(key)) {
        nestedDataMap.set(key, []);
      }
      nestedDataMap.get(key).push(nestedRow);
    });

    // Function to get nested data for a row
    const getNestedDataForRow = (row: any) => {
      const key = String(row[mainKey] ?? "");
      const nestedData = nestedDataMap.get(key) || [];

      return nestedData;
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
