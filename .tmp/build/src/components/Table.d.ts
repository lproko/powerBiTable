import React from "react";
interface TableProps {
    columns: {
        header: string;
        accessorKey: string;
    }[];
    data: any[];
}
export declare const Table: React.FC<TableProps>;
export {};
