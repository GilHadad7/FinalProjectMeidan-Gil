import React, { useState, useEffect, useCallback } from 'react';
import AddPaymentTenant from '../../components/tenant/AddPaymentTenant';
import PaymentsTableTenant from '../../components/tenant/PaymentsTableTenant';
import FormWithTableLayout from '../../components/ui/FormWithTableLayout';
import SearchInput from '../../components/ui/SearchInput';
import classes from './PaymentsTenantPage.module.css';

export default function PaymentsTenantPage() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);

  const [filters, setFilters] = useState({
    tenant: '',
    building: '',
    status: '',
    fromDate: '',
    toDate: '',
  });

  // 📌 שליפת הדייר והבניין שלו מה-sessionStorage
  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem('user')) || null; } catch { return null; }
  })();
  const tenantBuildingId = user?.building_id ?? user?.buildingId ?? null;

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantBuildingId]);

  const fetchPayments = () => {
    const base = 'http://localhost:8801/api/tenant/payments';
    const url =
      tenantBuildingId != null
        ? `${base}?building_id=${encodeURIComponent(tenantBuildingId)}`
        : base;

    // ⬅️ בלי credentials כדי למנוע CORS עם '*'
    fetch(url)
      .then((res) => res.json())
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Error fetching tenant payments:', err);
        setPayments([]);
      });
  };

  const cleanString = (str) =>
    String(str ?? '')
      .normalize('NFKD')
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase();

  const getVal = (v) =>
    v && typeof v === 'object' && 'target' in v ? v.target.value : (v ?? '');

  const applyFilters = useCallback(() => {
    let result = payments;

    if (filters.tenant) {
      const q = cleanString(filters.tenant);
      result = result.filter((p) => cleanString(p?.tenant_name).includes(q));
    }

    if (filters.building) {
      const q = cleanString(filters.building);
      result = result.filter((p) => cleanString(p?.building_name).includes(q));
    }

    if (filters.status) {
      const q = cleanString(filters.status);
      result = result.filter((p) => cleanString(p?.status) === q);
    }

    if (filters.fromDate) {
      const from = new Date(filters.fromDate).setHours(0, 0, 0, 0);
      result = result.filter(
        (p) => new Date(p.payment_date).setHours(0, 0, 0, 0) >= from
      );
    }

    if (filters.toDate) {
      const to = new Date(filters.toDate).setHours(0, 0, 0, 0);
      result = result.filter(
        (p) => new Date(p.payment_date).setHours(0, 0, 0, 0) <= to
      );
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    result = [...result].sort((a, b) => {
      const da = Math.abs(new Date(a.payment_date).setHours(0,0,0,0) - today);
      const db = Math.abs(new Date(b.payment_date).setHours(0,0,0,0) - today);
      return da - db;
    });

    setFilteredPayments(result);
  }, [payments, filters]);

  useEffect(() => { applyFilters(); }, [filters, payments, applyFilters]);

  const handleDelete = (paymentId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את התשלום?')) return;

    // ⬅️ בלי credentials
    fetch(`http://localhost:8801/api/tenant/payments/${paymentId}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => fetchPayments())
      .catch((err) => console.error('Error deleting payment:', err));
  };

  const handleEdit = (updatedPayment) => {
    // ⬅️ בלי credentials
    fetch(`http://localhost:8801/api/tenant/payments/${updatedPayment.payment_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayment),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          console.error('❌ שגיאה מהשרת:', err);
          alert('שגיאה בשמירת התשלום');
          return;
        }
        await res.json();
        fetchPayments();
      })
      .catch((err) => {
        console.error('❌ שגיאת חיבור לשרת:', err);
        alert('בעיה בחיבור לשרת');
      });
  };

  const totalPaid = filteredPayments.reduce(
    (s, p) => s + (p.status === 'שולם' ? Number(p.amount) : 0), 0
  );
  const openDebts = filteredPayments.reduce(
    (s, p) => s + (p.status !== 'שולם' ? Number(p.amount) : 0), 0
  );
  const debtTenants = filteredPayments.filter(p => p.status !== 'שולם').map(p => p.tenant_name);

  return (
    <FormWithTableLayout
      title="הוספת תשלומים"
      formComponent={<AddPaymentTenant onAdd={fetchPayments} />}
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
            <div className={classes.rowLine}>
              <div className={classes.search}>
                <SearchInput
                  placeholder="חפש לפי דייר"
                  value={filters.tenant}
                  onChange={(v) => setFilters((f) => ({ ...f, tenant: getVal(v) }))}
                />
              </div>

              <div className={classes.search}>
                <SearchInput
                  placeholder="חפש לפי בניין"
                  value={filters.building}
                  onChange={(v) => setFilters((f) => ({ ...f, building: getVal(v) }))}
                />
              </div>

              <select
                className={classes.statusSelect}
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">סטטוס</option>
                <option value="שולם">שולם</option>
                <option value="ממתין">ממתין</option>
                <option value="חוב">חוב</option>
              </select>
            </div>

            <div className={classes.rowLine}>
              <div className={classes.dateFilterWrapper}>
                <label>מתאריך</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                />
              </div>

              <div className={classes.dateFilterWrapper}>
                <label>עד תאריך</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <PaymentsTableTenant
            payments={filteredPayments}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      }
      plainTableArea
      compact
      wrapperClassName={classes.tightTop}
    />
  );
}
