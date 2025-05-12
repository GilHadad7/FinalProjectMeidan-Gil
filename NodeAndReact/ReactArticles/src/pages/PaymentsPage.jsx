import React, { useState } from 'react';
import classes from './PaymentsPage.module.css';
import { FaEdit, FaPlus, FaFileInvoice, FaDownload, FaBell, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const initialPayments = [
  { id: 1, tenant: 'יוסי כהן', building: 'נוף ים', date: '01.04.25', category: 'ועד בית', desc: 'חודשי רגיל', amount: 250, status: 'שולם', type: 'קבלה' },
  { id: 2, tenant: 'רונית לוי', building: 'שער העיר', date: '02.04.25', category: 'תחזוקה', desc: 'תיקון אינטרקום', amount: 80, status: 'שולם', type: 'חשבונית' },
  { id: 3, tenant: 'דנה פרי', building: 'נוף ים', date: '04.04.25', category: 'הדברה', desc: 'שנתית', amount: 40, status: 'שולם', type: 'קבלה' },
  { id: 4, tenant: 'שחר ברק', building: 'המרכזי', date: '05.04.25', category: 'חניה', desc: 'שלט חדש', amount: 120, status: 'ממתין', type: 'קבלה' },
];

const buildings = ['הכל', 'נוף ים', 'שער העיר', 'המרכזי'];
const statuses = ['הכל', 'שולם', 'ממתין', 'חוב'];

export default function PaymentsPage() {
  // ... קיים
  const [editPayment, setEditPayment] = useState(null);
  const [editForm, setEditForm] = useState({});

  function openEdit(payment) {
    setEditPayment(payment);
    setEditForm({...payment});
  }
  function handleEditChange(e) {
    const {name, value} = e.target;
    setEditForm(f => ({...f, [name]: value}));
  }
  function handleEditSave(e) {
    e.preventDefault();
    setPayments(payments => payments.map(p => p.id === editForm.id ? {...editForm, amount: Number(editForm.amount)} : p));
    setEditPayment(null);
    setEditForm({});
  }
  function handleEditCancel() {
    setEditPayment(null);
    setEditForm({});
  }
  // localStorage persistence
  const [payments, setPayments] = React.useState(() => {
    const saved = localStorage.getItem('payments');
    return saved ? JSON.parse(saved) : initialPayments;
  });
  const [buildingsList, setBuildingsList] = React.useState(() => {
    const saved = localStorage.getItem('buildingsList');
    return saved ? JSON.parse(saved) : buildings.filter(b=>b!=="הכל");
  });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({tenant:'', building:'', date:'', category:'', desc:'', amount:'', status:'שולם'});
  const [showNewBuilding, setShowNewBuilding] = useState(false);
  const [newBuilding, setNewBuilding] = useState("");

  // שמירה ל-localStorage בכל שינוי
  React.useEffect(() => {
    localStorage.setItem('payments', JSON.stringify(payments));
  }, [payments]);
  React.useEffect(() => {
    localStorage.setItem('buildingsList', JSON.stringify(buildingsList));
  }, [buildingsList]);

  function handleAddChange(e) {
    const {name, value} = e.target;
    setAddForm(f => ({...f, [name]: value}));
    if(name === 'building' && value === '__new__') {
      setShowNewBuilding(true);
    } else if(name === 'building') {
      setShowNewBuilding(false);
      setNewBuilding("");
    }
  }
  function handleAddPayment(e) {
    e.preventDefault();
    let buildingVal = addForm.building;
    if (showNewBuilding && newBuilding.trim()) {
      setBuildingsList(list => list.includes(newBuilding.trim()) ? list : [...list, newBuilding.trim()]);
      buildingVal = newBuilding.trim();
    }
    setPayments(payments => [
      ...payments,
      {
        ...addForm,
        building: buildingVal,
        id: payments.length ? Math.max(...payments.map(p=>p.id))+1 : 1,
        amount: Number(addForm.amount),
        type: 'קבלה',
      }
    ]);
    setAddForm({tenant:'', building:'', date:'', category:'', desc:'', amount:'', status:'שולם'});
    setShowAdd(false);
    setShowNewBuilding(false);
    setNewBuilding("");
  }

  const [building, setBuilding] = useState('הכל');
  const [status, setStatus] = useState('הכל');

  // סינון
  const filtered = payments.filter(p =>
    (building === 'הכל' || p.building === building) &&
    (status === 'הכל' || p.status === status)
  );

  // סכום גבייה
  const total = filtered.reduce((sum, p) => sum + (p.status === 'שולם' ? p.amount : 0), 0);
  const paidTenants = filtered.filter(p => p.status === 'שולם').map(p => p.tenant);

  return (
    <div className={classes.root}>
      <h2 className={classes.title}>Payments</h2>
      <div className={classes.filtersBar}>
        <button className={classes.addPaymentFab} title="הוסף תשלום חדש" onClick={() => setShowAdd(true)}><FaPlus /></button>
        <select className={classes.select + ' ' + classes.compactSelect} value={building} onChange={e => setBuilding(e.target.value)}>
          {buildings.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className={classes.select + ' ' + classes.compactSelect} value={status} onChange={e => setStatus(e.target.value)}>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {showAdd && (
        <div className={classes.modalOverlay} onClick={e => {if(e.target.className.includes('modalOverlay')) setShowAdd(false)}}>
          <div className={classes.modalContent}>
            <button className={classes.closeModal} onClick={()=>setShowAdd(false)}>×</button>
            <h3>הוסף תשלום חדש</h3>
            <form onSubmit={handleAddPayment} className={classes.addForm}>
              <label>דייר:<input required name="tenant" value={addForm.tenant} onChange={handleAddChange}/></label>
              <label>בניין:
                <select required name="building" value={addForm.building} onChange={handleAddChange}>
                  <option value="">בחר</option>
                  {buildingsList.map(b=><option key={b} value={b}>{b}</option>)}
                  <option value="__new__">הוסף בניין חדש...</option>
                </select>
                {showNewBuilding && (
                  <input
                    name="newBuilding"
                    placeholder="שם בניין חדש"
                    value={newBuilding}
                    onChange={e=>setNewBuilding(e.target.value)}
                    required
                    style={{marginTop:6}}
                  />
                )}
              </label>
              <label>תאריך:<input required name="date" value={addForm.date} onChange={handleAddChange} type="date"/></label>
              <label>קטגוריה:<input required name="category" value={addForm.category} onChange={handleAddChange}/></label>
              <label>תיאור:<input name="desc" value={addForm.desc} onChange={handleAddChange}/></label>
              <label>סכום:<input required name="amount" value={addForm.amount} onChange={handleAddChange} type="number" min="0"/></label>
              <label>סטטוס:
                <select required name="status" value={addForm.status} onChange={handleAddChange}>
                  <option value="שולם">שולם</option>
                  <option value="ממתין">ממתין</option>
                  <option value="חוב">חוב</option>
                </select>
              </label>
              <div className={classes.modalActions}>
                <button type="submit">שמור</button>
                <button type="button" onClick={()=>setShowAdd(false)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editPayment && (
        <div className={classes.modalOverlay} onClick={e => {if(e.target.className.includes('modalOverlay')) handleEditCancel()}}>
          <div className={classes.modalContent}>
            <button className={classes.closeModal} onClick={handleEditCancel}>×</button>
            <h3>עריכת תשלום</h3>
            <form onSubmit={handleEditSave} className={classes.addForm}>
              <label>דייר:<input required name="tenant" value={editForm.tenant||''} onChange={handleEditChange}/></label>
              <label>בניין:
                <select required name="building" value={editForm.building||''} onChange={handleEditChange}>
                  <option value="">בחר</option>
                  {buildingsList.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label>תאריך:<input required name="date" value={editForm.date||''} onChange={handleEditChange} type="date"/></label>
              <label>קטגוריה:<input required name="category" value={editForm.category||''} onChange={handleEditChange}/></label>
              <label>תיאור:<input name="desc" value={editForm.desc||''} onChange={handleEditChange}/></label>
              <label>סכום:<input required name="amount" value={editForm.amount||''} onChange={handleEditChange} type="number" min="0"/></label>
              <label>סטטוס:
                <select required name="status" value={editForm.status||''} onChange={handleEditChange}>
                  <option value="שולם">שולם</option>
                  <option value="ממתין">ממתין</option>
                  <option value="חוב">חוב</option>
                </select>
              </label>
              <div className={classes.modalActions}>
                <button type="submit">שמור</button>
                <button type="button" onClick={handleEditCancel}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className={classes.tableWrapper}>
        <table className={classes.paymentsTable}>
          <thead>
            <tr>
              <th>דייר</th>
              <th>בניין</th>
              <th>תאריך</th>
              <th>קטגוריה</th>
              <th>תיאור</th>
              <th>סכום</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{textAlign:'center'}}>לא נמצאו תשלומים</td></tr>
            ) : filtered.map(payment => (
              <tr key={payment.id}>
                <td>{payment.tenant}</td>
                <td>{payment.building}</td>
                <td>{payment.date}</td>
                <td>{payment.category}</td>
                <td>{payment.desc}</td>
                <td>{payment.amount} ₪</td>
                <td>
                  {payment.status === 'שולם' && <span className={classes.statusPaid}><FaCheckCircle/> שולם</span>}
                  {payment.status === 'ממתין' && <span className={classes.statusPending}><FaBell/> ממתין</span>}
                  {payment.status === 'חוב' && <span className={classes.statusDebt}><FaTimesCircle/> חוב</span>}
                </td>
                <td className={classes.actionsCell}>
                  <button className={classes.actionBtn} title="ערוך" onClick={() => openEdit(payment)}><FaEdit/></button>
                  <button className={classes.actionBtn} title="חשבונית/קבלה" onClick={() => alert('הורדת קבלה/חשבונית עבור: ' + payment.tenant)}><FaFileInvoice/></button>
                  <button className={classes.actionBtn} title="הורד" onClick={() => alert('הורדת קובץ תשלום עבור: ' + payment.tenant)}><FaDownload/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={classes.summaryRow}>
        <span>סה"כ גבייה לתשלום בחודש: <b>{total.toLocaleString()} ₪</b></span>
        <span>דיירים ששילמו: <b>{paidTenants.join(', ') || '---'}</b></span>
      </div>
    </div>
  );
}
