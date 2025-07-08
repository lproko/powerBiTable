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
    const dataView = options.dataViews[0];
    if (!dataView || !dataView.categorical) {
      return;
    }

    // Get categories and separate them into main and nested based on roles
    const categories = dataView.categorical.categories || [];
    console.log("All Categories:", categories);

    // Separate categories based on roles
    const mainCategories = categories.filter(
      (category) => category.source.roles?.category
    );
    const nestedCategories = categories.filter(
      (category) => category.source.roles?.nested
    );

    console.log("Main Categories:", mainCategories);
    console.log("Nested Categories:", nestedCategories);

    // Transform main data
    const columns = mainCategories.map((category) => ({
      header: category.source.displayName,
      accessorKey: category.source.displayName,
    }));

    const data = this.transformData(mainCategories);

    // Transform nested data
    const nestedColumns = nestedCategories.map((category) => ({
      header: category.source.displayName,
      accessorKey: category.source.displayName,
    }));

    // Create a map of parent row identifiers to nested data
    const nestedDataMap = new Map();

    // Use the first main category (e.g., Pest) as the key for matching
    const mainKey = mainCategories[0].source.displayName;

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
      const key = mainValue.toString();
      if (!nestedDataMap.has(key)) {
        nestedDataMap.set(key, []);
      }
      nestedDataMap.get(key).push(nestedRow);
    });

    // Function to get nested data for a row
    const getNestedDataForRow = (row: any) => {
      const key = row[mainKey].toString();
      const nestedData = nestedDataMap.get(key) || [];
      console.log("Getting nested data for row:", row);
      console.log("Key:", key);
      console.log("Found nested data:", nestedData);
      return nestedData;
    };

    // Add detailed logging
    console.log("Main Columns:", columns);
    console.log("Main Data:", data);
    console.log("Nested Columns:", nestedColumns);
    console.log("Nested Data Map:", nestedDataMap);
    console.log(
      "Sample nested data for first row:",
      getNestedDataForRow(data[0])
    );

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
