import * as XLSX from "xlsx";
export function exportRows(rows){const wb=XLSX.utils.book_new();const ws=XLSX.utils.json_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,"Document Register");XLSX.writeFile(wb,"MDCT-Document-Register.xlsx");}
