import React, { useState } from 'react';
import classes from './ReportsPage.module.css';
import { FaDownload, FaEye, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const initialReports = [
  // 2025
  { id: 1, year: 2025, month: 'ינואר', type: 'שכר', status: 'מאושר', file: 'salary_jan.pdf', created: '2025-01-10' },
  { id: 2, year: 2025, month: 'פברואר', type: 'נוכחות', status: 'ממתין', file: 'attendance_feb.pdf', created: '2025-02-11' },
  { id: 3, year: 2025, month: 'מרץ', type: 'הוצאות', status: 'נדחה', file: 'expenses_mar.pdf', created: '2025-03-09' },
  // 2024
  { id: 4, year: 2024, month: 'אפריל', type: 'שכר', status: 'מאושר', file: 'salary_apr.pdf', created: '2024-04-12' },
  { id: 5, year: 2024, month: 'מאי', type: 'נוכחות', status: 'מאושר', file: 'attendance_may.pdf', created: '2024-05-15' },
  { id: 6, year: 2024, month: 'יוני', type: 'הוצאות', status: 'ממתין', file: 'expenses_jun.pdf', created: '2024-06-14' },
  // 2023
  { id: 7, year: 2023, month: 'יולי', type: 'שכר', status: 'נדחה', file: 'salary_jul.pdf', created: '2023-07-10' },
  { id: 8, year: 2023, month: 'אוגוסט', type: 'נוכחות', status: 'מאושר', file: 'attendance_aug.pdf', created: '2023-08-13' },
  { id: 9, year: 2023, month: 'ספטמבר', type: 'הוצאות', status: 'מאושר', file: 'expenses_sep.pdf', created: '2023-09-17' },
];

const reportTypes = ['הכל', 'שכר', 'נוכחות', 'הוצאות'];
const years = [2025, 2024, 2023];

// דוחות דמו בסיסיים
function getSalaryReportHtml(report) {
  return `<div style="padding:24px"><h2>דוח שכר</h2><p>חודש: ${report.month} ${report.year}</p><p>סטטוס: ${report.status}</p></div>`;
}
function getExpenseReportHtml(report) {
  return `<div style="padding:24px"><h2>דוח הוצאות</h2><p>חודש: ${report.month} ${report.year}</p><p>סטטוס: ${report.status}</p></div>`;
}
function getAttendanceReportHtml(report) {
  return `<div style="padding:24px"><h2>דוח נוכחות</h2><p>חודש: ${report.month} ${report.year}</p><p>סטטוס: ${report.status}</p></div>`;
}

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [selectedType, setSelectedType] = useState('הכל');
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState(initialReports);
  const [showPreview, setShowPreview] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [newReport, setNewReport] = useState({
    year: years[0],
    month: '',
    type: reportTypes[1],
    status: 'ממתין',
    file: '',
    created: new Date().toISOString().slice(0,10)
  });
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success'); // or 'error'
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const statuses = ['מאושר', 'ממתין', 'נדחה'];

  // סינון דוחות
  const filteredReports = reports.filter(r =>
    (selectedType === 'הכל' || r.type === selectedType) &&
    (selectedYear === 'הכל' || r.year === selectedYear) &&
    (search === '' || r.month.includes(search) || r.type.includes(search))
  );

  // הורדת דוח בודד (PDF דמו אמיתי)
  const handleDownload = async (report) => {
    if (!report.file) {
      setMessage('אין קובץ לדוח זה');
      setMessageType('error');
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    let html = '';
    if (report.type === 'שכר') html = getSalaryReportHtml(report);
    else if (report.type === 'הוצאות') html = getExpenseReportHtml(report);
    else if (report.type === 'נוכחות') html = getAttendanceReportHtml(report);
    else html = '<div>דוח דמו</div>';
    // צור אלמנט זמני
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    // הפוך PDF
    const canvas = await html2canvas(temp, {scale:2});
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(report.file);
    document.body.removeChild(temp);
    setMessage('הקובץ ירד בהצלחה!');
    setMessageType('success');
    setTimeout(() => setMessage(null), 2000);
  };


  const paginatedReports = filteredReports.slice((page-1)*pageSize, page*pageSize);
  const totalPages = Math.ceil(filteredReports.length / pageSize);

  const handlePreview = (report) => {
    setPreviewReport(report);
    setShowPreview(true);
  };

  const handleAddReport = (e) => {
    e.preventDefault();
    setReports([
      ...reports,
      {
        ...newReport,
        id: reports.length + 1,
        created: new Date().toISOString().slice(0,10),
      }
    ]);
    setShowAddModal(false);
    setNewReport({ year: years[0], month: '', type: reportTypes[1], status: 'ממתין', file: '', created: new Date().toISOString().slice(0,10) });
    setMessage('הדוח נוסף בהצלחה!');
    setMessageType('success');
    setTimeout(() => setMessage(null), 2000);
  };

  const handleEditClick = (report) => {
    setEditReport(report);
    setShowEditModal(true);
  };

  const handleEditReport = (e) => {
    e.preventDefault();
    setReports(reports.map(r => r.id === editReport.id ? editReport : r));
    setShowEditModal(false);
    setEditReport(null);
    setMessage('הדוח עודכן בהצלחה!');
    setMessageType('success');
    setTimeout(() => setMessage(null), 2000);
  };

  const handleDeleteReport = (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הדוח?')) {
      setReports(reports.filter(r => r.id !== id));
      setMessage('הדוח נמחק בהצלחה!');
      setMessageType('success');
      setTimeout(() => setMessage(null), 2000);
    }
  };



  const handleFileChange = (e, setFunc) => {
    const file = e.target.files[0];
    if (file) {
      setFunc(r => ({...r, file: file.name}));
    }
  };

  return (
    <div className={classes.reportsRoot}>
      {message && (
        <div style={{textAlign:'center',marginBottom:10,color:messageType==='success'?'#219150':'#d32f2f',fontWeight:'bold'}}>{message}</div>
      )}
      <div className={classes.filtersBar} dir="rtl" style={{justifyContent: 'center', marginBottom: 32}}>
  <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
    <button className={classes.addReportBtn} onClick={() => setShowAddModal(true)}>
      יצירת דוח חדש <FaPlus style={{marginRight: 6, verticalAlign: 'middle'}}/>
    </button>
    <div className={classes.filterItem}>
      <label className={classes.filterLabel}>שנה:</label>
      <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
    <div className={classes.filterItem}>
      <label className={classes.filterLabel}>סוג דוח:</label>
      <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
        {reportTypes.map(type => <option key={type} value={type}>{type}</option>)}
      </select>
    </div>
    <div className={classes.filterItem}>
      <label className={classes.filterLabel}>חיפוש:</label>
      <input
        type="text"
        placeholder="חיפוש לפי חודש/סוג"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={classes.searchInput}
      />
    </div>
  </div>
</div>

      <div className={classes.tableWrapper}>
        <table className={classes.reportsTable}>
          <thead>
            <tr>
              <th>שנה</th>
              <th>חודש</th>
              <th>סוג</th>
              <th>סטטוס</th>
              <th>תאריך יצירה</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReports.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign:'center'}}>לא נמצאו דוחות</td></tr>
            ) : (
              paginatedReports.map(report => (
                <tr key={report.id}>
                  <td>{report.year}</td>
                  <td>{report.month}</td>
                  <td>{report.type}</td>
                  <td><span className={classes.statusTag} data-status={report.status}>{report.status}</span></td>
                  <td className={classes.dateCell}>{report.created}</td>
                  <td className={classes.actionsCell}>
                    <button className={classes.actionBtn} onClick={() => handlePreview(report)} title="תצוגה"><FaEye/></button>
                    <button className={classes.actionBtn} title="הורד" onClick={() => handleDownload(report)}><FaDownload/></button>
                    <button className={classes.actionBtn} onClick={() => handleEditClick(report)} title="ערוך"><FaEdit/></button>
                    <button className={classes.actionBtn} onClick={() => handleDeleteReport(report.id)} title="מחק"><FaTrash/></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className={classes.pagination}>
          <button className={classes.pageBtn} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>{'<'}</button>
          {Array.from({length: totalPages}, (_,i)=>(
            <button key={i+1} className={classes.pageBtn + (page===i+1?' active':'')} onClick={()=>setPage(i+1)}>{i+1}</button>
          ))}
          <button className={classes.pageBtn} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>{'>'}</button>
        </div>
      )}

      {/* פופאפ תצוגה מקדימה */}
      {showPreview && previewReport && (
        <div className={classes.previewOverlay} onClick={() => setShowPreview(false)}>
          <div className={classes.previewModal} onClick={e => e.stopPropagation()} dir="rtl" style={{maxWidth:'650px',background:'#fff'}}>
            <h3 style={{color:'#b8925c',marginBottom:10}}>תצוגה מקדימה לדוח</h3>
            <div style={{marginBottom:20}}>
              {previewReport.type === 'שכר' && (
                <div dangerouslySetInnerHTML={{__html: getSalaryReportHtml(previewReport)}} />
              )}
              {previewReport.type === 'הוצאות' && (
                <div dangerouslySetInnerHTML={{__html: getExpenseReportHtml(previewReport)}} />
              )}
              {previewReport.type === 'נוכחות' && (
                <div dangerouslySetInnerHTML={{__html: getAttendanceReportHtml(previewReport)}} />
              )}
              {!(previewReport.type === 'שכר' || previewReport.type === 'הוצאות' || previewReport.type === 'נוכחות') && (
                <div>דוח דמו</div>
              )}
            </div>
            <button className={classes.closePreviewBtn} onClick={() => setShowPreview(false)}>סגור</button>
          </div>
        </div>
      )}

      {/* פופאפ הוספת דוח חדש */}
      {showAddModal && (
        <div className={classes.previewOverlay} onClick={() => setShowAddModal(false)}>
          <div className={classes.previewModal} onClick={e => e.stopPropagation()} dir="rtl">
            <h3>הוספת דוח חדש</h3>
            <form onSubmit={handleAddReport} className={classes.profileForm} dir="rtl">
              <div className={classes.formRow}><label className={classes.formLabel}>שנה:</label><select value={newReport.year} onChange={e => setNewReport(r => ({...r, year: Number(e.target.value)}))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div className={classes.formRow}><label className={classes.formLabel}>חודש:</label><select value={newReport.month} onChange={e => setNewReport(r => ({...r, month: e.target.value}))} required><option value="">בחר חודש</option>{months.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div className={classes.formRow}><label className={classes.formLabel}>סוג דוח:</label><select value={newReport.type} onChange={e => setNewReport(r => ({...r, type: e.target.value}))} required>{reportTypes.filter(t => t !== 'הכל').map(type => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className={classes.formRow}><label className={classes.formLabel}>סטטוס:</label><select value={newReport.status} onChange={e => setNewReport(r => ({...r, status: e.target.value}))} required>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className={classes.formRow}><label className={classes.formLabel}>קובץ דוח:</label><input type="file" accept=".pdf,.xls,.xlsx" onChange={e=>handleFileChange(e,setNewReport)} /></div>
              <div className={classes.profileModalActions}>
                <button type="submit" className={classes.saveProfileBtn}>הוסף</button>
                <button type="button" className={classes.cancelProfileBtn} onClick={() => setShowAddModal(false)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* פופאפ עריכת דוח */}
      {showEditModal && editReport && (
        <div className={classes.previewOverlay} onClick={() => setShowEditModal(false)}>
          <div className={classes.previewModal} onClick={e => e.stopPropagation()} dir="rtl">
            <h3>עריכת דוח</h3>
            <form onSubmit={handleEditReport} className={classes.profileForm} dir="rtl">
              <div className={classes.formRow}><label className={classes.formLabel}>שנה:</label><select value={editReport.year} onChange={e => setEditReport(r => ({...r, year: Number(e.target.value)}))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div className={classes.formRow}><label className={classes.formLabel}>חודש:</label><select value={editReport.month} onChange={e => setEditReport(r => ({...r, month: e.target.value}))} required><option value="">בחר חודש</option>{months.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div className={classes.formRow}><label className={classes.formLabel}>סוג דוח:</label><select value={editReport.type} onChange={e => setEditReport(r => ({...r, type: e.target.value}))} required>{reportTypes.filter(t => t !== 'הכל').map(type => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className={classes.formRow}><label className={classes.formLabel}>סטטוס:</label><select value={editReport.status} onChange={e => setEditReport(r => ({...r, status: e.target.value}))} required>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className={classes.formRow}><label className={classes.formLabel}>קובץ דוח:</label><input type="file" accept=".pdf,.xls,.xlsx" onChange={e=>handleFileChange(e,setEditReport)} /></div>
              <div className={classes.profileModalActions}>
                <button type="submit" className={classes.saveProfileBtn}>שמור</button>
                <button type="button" className={classes.cancelProfileBtn} onClick={() => setShowEditModal(false)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
