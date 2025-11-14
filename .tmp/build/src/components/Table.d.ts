import React from "react";
import powerbi from "powerbi-visuals-api";
import { RowData } from "@tanstack/react-table";
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
export declare const Table: React.FC<TableProps>;
export {};
