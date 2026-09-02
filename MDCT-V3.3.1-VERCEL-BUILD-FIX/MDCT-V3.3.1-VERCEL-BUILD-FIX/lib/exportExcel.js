import * as XLSX from "xlsx";
export function exportRows(rows){
 const clean=rows.map(r=>({
  Contractor:r.contractor_name||'',"Document Number":r.document_number||'',Title:r.document_title||'',Facility:r.facility_code||'',TSS:r.train_system_code||'',"Discipline Code":r.discipline_code||'',Discipline:r.discipline_name||'',"Document Type":r.document_type_code||'',Revision:r.revision||'',"Issue Status":r.issue_status||'',"Submission Transmittal":r.submission_transmittal||'',"Submitted Date":r.submitted_date||'',"Miran Due Date":r.due_date||'',"Return Transmittal":r.return_transmittal||'',"Returned Date":r.returned_date||'',"Return Code":r.return_code?`Code-${r.return_code}`:'',"Return Status":r.return_status||'',"Review Status":r.status||'',"Overdue Days":r.overdue_days||0,"Outlook Email":r.email_web_link||''
 }));
 const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(clean); ws['!cols']=[18,24,42,10,10,14,24,16,10,14,22,14,14,22,14,12,24,14,12,55].map(w=>({wch:w})); XLSX.utils.book_append_sheet(wb,ws,"Document Register");
 const summary=[['MDCT Export Summary',''],['Exported At',new Date().toISOString()],['Total Records',clean.length],['Overdue',clean.filter(x=>x['Review Status']==='OVERDUE').length],['Under Review',clean.filter(x=>x['Review Status']==='UNDER REVIEW').length],['Returned',clean.filter(x=>x['Review Status']==='RETURNED').length]]; XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'Summary');
 XLSX.writeFile(wb,"MDCT-Document-Register.xlsx");
}
