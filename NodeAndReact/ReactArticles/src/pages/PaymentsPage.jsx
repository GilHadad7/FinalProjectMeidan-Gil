import React, { useState, useEffect, useCallback } from 'react';
import AddPayment from '../components/AddPayment';
import PaymentsTable from '../components/PaymentsTable';
import FormWithTableLayout from '../components/ui/FormWithTableLayout';
import classes from './PaymentsPage.module.css';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [buildingsList] = useState([]);

  const [filters, setFilters] = useState({
    tenant: '',
    building: '',
    status: '',
    fromDate: '',
    toDate: '',
  });

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = () => {
    fetch("http://localhost:8801/api/payments")
      .then(res => res.json())
      .then(data => setPayments(Array.isArray(data) ? data : []))
      .catch(err => { console.error("Error fetching payments:", err); setPayments([]); });
  };

  const cleanString = (str) =>
    (str || "").normalize("NFKD")
      .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
      .replace(/\s+/g, "")
      .trim()
      .toLowerCase();

  const applyFilters = useCallback(() => {
    let result = payments;

    if (filters.tenant)   result = result.filter(p => p.tenant_name.includes(filters.tenant));
    if (filters.building) result = result.filter(p => p.building_name?.includes(filters.building));
    if (filters.status)   result = result.filter(p => cleanString(p.status) === cleanString(filters.status));
    if (filters.fromDate) {
      const from = new Date(filters.fromDate).setHours(0,0,0,0);
      result = result.filter(p => new Date(p.payment_date).setHours(0,0,0,0) >= from);
    }
    if (filters.toDate) {
      const to = new Date(filters.toDate).setHours(0,0,0,0);
      result = result.filter(p => new Date(p.payment_date).setHours(0,0,0,0) <= to);
    }

    const today = new Date(); today.setHours(0,0,0,0);
    result = [...result].sort((a,b) => {
      const da = Math.abs(new Date(a.payment_date).setHours(0,0,0,0) - today);
      const db = Math.abs(new Date(b.payment_date).setHours(0,0,0,0) - today);
      return da - db;
    });

    setFilteredPayments(result);
  }, [payments, filters]);

  useEffect(() => { applyFilters(); }, [filters, payments, applyFilters]);

  const handleDelete = (paymentId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את התשלום?")) return;
    fetch(`http://localhost:8801/api/payments/${paymentId}`, { method: "DELETE" })
      .then(res => res.json())
      .then(() => fetchPayments())
      .catch(err => console.error("Error deleting payment:", err));
  };

  const handleEdit = (updatedPayment) => {
    fetch(`http://localhost:8801/api/payments/${updatedPayment.payment_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPayment),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          console.error("❌ שגיאה מהשרת:", err);
          alert("שגיאה בשמירת התשלום");
          return;
        }
        await res.json();
        fetchPayments();
      })
      .catch(err => {
        console.error("❌ שגיאת חיבור לשרת:", err);
        alert("בעיה בחיבור לשרת");
      });
  };

  const totalPaid   = filteredPayments.reduce((s,p) => s + (p.status === "שולם" ? Number(p.amount) : 0), 0);
  const openDebts   = filteredPayments.reduce((s,p) => s + (p.status !== "שולם" ? Number(p.amount) : 0), 0);
  const debtTenants = filteredPayments.filter(p => p.status !== "שולם").map(p => p.tenant_name);

  return (
    <FormWithTableLayout
      title="הוספת תשלומים"
      formComponent={<AddPayment buildingsList={buildingsList} onAdd={fetchPayments} />}

      summaryComponent={
        <div className={classes.summaryCards}>
          <div className={classes.card}>💰 סה״כ גבייה: <b>{totalPaid.toLocaleString()} ₪</b></div>
          <div className={classes.card}>❌ חובות פתוחים: <b>{openDebts.toLocaleString()} ₪</b></div>
          <div className={classes.card}>🧍‍♂️ דיירים חייבים: <b>{debtTenants.length}</b></div>
        </div>
      }

      tableComponent={
        <>
          <div className={classes.filtersRow}>
            <input
              type="text"
              placeholder="חפש לפי דייר                    🔎"
              value={filters.tenant}
              onChange={e => setFilters({ ...filters, tenant: e.target.value })}
            />
            <input
              type="text"
              placeholder="חפש לפי בניין                   🔎"
              value={filters.building}
              onChange={e => setFilters({ ...filters, building: e.target.value })}
            />
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">סטטוס</option>
              <option value="שולם">שולם</option>
              <option value="ממתין">ממתין</option>
              <option value="חוב">חוב</option>
            </select>

            <div className={classes.dateFilterWrapper}>
              <label>מתאריך</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
              />
            </div>
            <div className={classes.dateFilterWrapper}>
              <label>עד תאריך</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={e => setFilters({ ...filters, toDate: e.target.value })}
              />
            </div>
          </div>

          <PaymentsTable
            payments={filteredPayments}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      }

      /* ↓ זה מה שמוריד את הרקע הלבן */
      plainTableArea
      /* ↓ מקטין ריווח כללי של הפריסה */
      compact
      /* ↓ כוונון נוסף לריווח העליון בעמוד הזה */
      wrapperClassName={classes.tightTop}
    />
  );
}
