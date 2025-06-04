import React, { useState, useEffect, useCallback } from 'react';
import AddPayment from '../components/AddPayment';
import PaymentsTable from '../components/PaymentsTable';
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

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = () => {
    fetch("http://localhost:8801/api/payments")
      .then(res => res.json())
      .then(data => setPayments(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error("Error fetching payments:", err);
        setPayments([]);
      });
  };

  const cleanString = (str) => {
    return (str || "")
      .normalize("NFKD")
      .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
      .replace(/\s+/g, "")
      .trim()
      .toLowerCase();
  };

  const applyFilters = useCallback(() => {
    let result = payments;

    if (filters.tenant)
      result = result.filter(p => p.tenant_name.includes(filters.tenant));
    if (filters.building)
      result = result.filter(p => p.building_name?.includes(filters.building));
    if (filters.status)
      result = result.filter(p => cleanString(p.status) === cleanString(filters.status));
    if (filters.fromDate)
      result = result.filter(p => new Date(p.payment_date) >= new Date(filters.fromDate));
    if (filters.toDate)
      result = result.filter(p => new Date(p.payment_date) <= new Date(filters.toDate));

    setFilteredPayments(result);
  }, [payments, filters]);

  useEffect(() => {
    applyFilters();
  }, [filters, payments, applyFilters]);

  const handleDelete = (paymentId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את התשלום?")) {
      fetch(`http://localhost:8801/api/payments/${paymentId}`, {
        method: "DELETE",
      })
        .then(res => res.json())
        .then(() => fetchPayments())
        .catch(err => console.error("Error deleting payment:", err));
    }
  };

  const handleEdit = (updatedPayment) => {
    fetch(`http://localhost:8801/api/payments/${updatedPayment.payment_id}`, {
      method: "PATCH", // ✅ תואם לראוטר שלך
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

        const updated = await res.json();
        console.log("✅ תשלום עודכן:", updated);
        fetchPayments();
      })
      .catch(err => {
        console.error("❌ שגיאת חיבור לשרת:", err);
        alert("בעיה בחיבור לשרת");
      });
  };

  const totalPaid = filteredPayments.reduce(
    (sum, p) => sum + (p.status === "שולם" ? Number(p.amount) : 0), 0);
  const openDebts = filteredPayments.reduce(
    (sum, p) => sum + (p.status !== "שולם" ? Number(p.amount) : 0), 0);
  const debtTenants = filteredPayments.filter(p => p.status !== "שולם").map(p => p.tenant_name);

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.leftPanel}>
        <AddPayment buildingsList={buildingsList} onAdd={fetchPayments} />
      </div>

      <div className={classes.rightPanel}>
        <div className={classes.pageTitle}>טבלת תשלומים</div>

        <div className={classes.filtersRow}>
          <input
            type="text"
            placeholder="חפש לפי דייר"
            value={filters.tenant}
            onChange={e => setFilters({ ...filters, tenant: e.target.value })}
          />
          <input
            type="text"
            placeholder="חפש לפי בניין"
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

        <div className={classes.summaryCards}>
          <div className={classes.card}>💰 סה״כ גבייה: <b>{totalPaid.toLocaleString()} ₪</b></div>
          <div className={classes.card}>❌ חובות פתוחים: <b>{openDebts.toLocaleString()} ₪</b></div>
          <div className={classes.card}>🧍‍♂️ דיירים חייבים: <b>{debtTenants.length}</b></div>
        </div>

        <PaymentsTable
          payments={filteredPayments}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
