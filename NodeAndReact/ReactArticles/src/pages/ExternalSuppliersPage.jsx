import React, { useState } from 'react';
import classes from './ExternalSuppliersPage.module.css';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const initialSuppliers = [
  {
    name: 'חשמל אור בע״מ',
    field: 'חשמל',
    phone: '050-1111111',
    email: 'electric@or.co.il',
    buildings: 'נוף ים, שער העיר',
  },
  {
    name: 'הדברת דובדבן',
    field: 'הדברה',
    phone: '052-2222222',
    email: 'pest@dovdevan.co.il',
    buildings: 'המרכזי',
  },
  {
    name: 'אינסטלציה רם',
    field: 'אינסטלציה',
    phone: '054-3333333',
    email: 'ram@waterfix.co.il',
    buildings: 'נוף ים',
  },
  {
    name: 'ש.ש ניקיון',
    field: 'ניקיון',
    phone: '053-4444444',
    email: 'clean@shsh.co.il',
    buildings: 'כל הבניינים',
  },
];

export default function ExternalSuppliersPage() {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState('');
  const [newSupplier, setNewSupplier] = useState({
    name: '', field: '', phone: '', email: '', buildings: ''
  });

  const filteredSuppliers = suppliers.filter(s =>
    s.name.includes(search) || s.field.includes(search) || s.phone.includes(search) || s.email.includes(search)
  );

  function handleInputChange(e) {
    setNewSupplier({ ...newSupplier, [e.target.name]: e.target.value });
  }

  function handleAddSupplier() {
    if (!newSupplier.name) return;
    setSuppliers([...suppliers, newSupplier]);
    setNewSupplier({ name: '', field: '', phone: '', email: '', buildings: '' });
  }

  function handleDelete(index) {
    setSuppliers(suppliers.filter((_, i) => i !== index));
  }

  function handleEdit(index) {
    setNewSupplier(suppliers[index]);
    handleDelete(index);
  }

  return (
    <div className={classes.container}>
      <div className={classes.headerRow}>
        <div className={classes.pageTitle}>external suppliers</div>
        <div className={classes.searchBox}>
          <label>חיפוש:</label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={classes.input}
          />
        </div>
      </div>
      <div className={classes.contentRow}>
        <div className={classes.sideForm}>
          <div className={classes.formTitle}>הוסף ספק:</div>
          <div className={classes.formField}>
            <label>שם ספק:</label>
            <input name="name" value={newSupplier.name} onChange={handleInputChange} className={classes.input} />
          </div>
          <div className={classes.formField}>
            <label>תחום:</label>
            <input name="field" value={newSupplier.field} onChange={handleInputChange} className={classes.input} />
          </div>
          <div className={classes.formField}>
            <label>טלפון:</label>
            <input name="phone" value={newSupplier.phone} onChange={handleInputChange} className={classes.input} />
          </div>
          <div className={classes.formField}>
            <label>מייל:</label>
            <input name="email" value={newSupplier.email} onChange={handleInputChange} className={classes.input} />
          </div>
          <div className={classes.formField}>
            <label>בניינים:</label>
            <input name="buildings" value={newSupplier.buildings} onChange={handleInputChange} className={classes.input} />
          </div>
          <button className={classes.addBtn} onClick={handleAddSupplier}>
            <FaPlus /> הוסף ספק
          </button>
        </div>
        <div className={classes.suppliersTableWrapper}>
          <table className={classes.suppliersTable}>
            <thead>
              <tr>
                <th>שם ספק</th>
                <th>תחום</th>
                <th>טלפון</th>
                <th>מייל</th>
                <th>בניינים</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.name}</td>
                  <td>{s.field}</td>
                  <td>{s.phone}</td>
                  <td><a href={`mailto:${s.email}`}>{s.email}</a></td>
                  <td>{s.buildings}</td>
                  <td>
                    <button className={classes.actionBtn} onClick={() => handleEdit(idx)}><FaEdit /></button>
                    <button className={classes.actionBtn} onClick={() => handleDelete(idx)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
