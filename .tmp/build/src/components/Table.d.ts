import React from "react";
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
}
export declare const Table: React.FC<TableProps>;
export {};
