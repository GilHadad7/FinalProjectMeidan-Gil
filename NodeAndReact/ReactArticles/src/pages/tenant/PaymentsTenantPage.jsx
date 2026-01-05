// 📁 C:\PATH\TO\YOUR\PROJECT\client\src\pages\tenant\PaymentsTenantPage.jsx
// דף תשלומים לדייר: מציג רק את התשלומים שלו + מאפשר עריכה/מחיקה לתשלומים במצב "ממתין"

import React, { useState, useEffect, useCallback } from "react";
import AddPaymentTenant from "../../components/tenant/AddPaymentTenant";
import PaymentsTableTenant from "../../components/tenant/PaymentsTableTenant";
import FormWithTableLayout from "../../components/ui/FormWithTableLayout";
import classes from "./PaymentsTenantPage.module.css";

export default function PaymentsTenantPage() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);

  const [filters, setFilters] = useState({
    status: "",
    fromDate: "",
    toDate: "",
  });

  // פונקציה ששולפת את המשתמש המחובר מה-sessionStorage בצורה בטוחה
  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user")) || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  })();

  const tenantBuildingId = user?.building_id ?? user?.buildingId ?? null;
  const tenantId = user?.user_id ?? user?.userId ?? user?.id ?? null;

  useEffect(() => {
    try {
      fetchPayments();
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantBuildingId, tenantId]);

  // פונקציה שמביאה מהשרת רק תשלומים של הדייר לפי tenant_id
  const fetchPayments = () => {
    try {
      const base = "http://localhost:8801/api/tenant/payments";

      const params = new URLSearchParams();
      if (tenantId != null) params.append("tenant_id", String(tenantId));
      if (tenantBuildingId != null) params.append("building_id", String(tenantBuildingId));

      const url = params.toString() ? `${base}?${params.toString()}` : base;

      fetch(url)
        .then((res) => res.json())
        .then((data) => setPayments(Array.isArray(data) ? data : []))
        .catch((err) => {
          console.error("Error fetching tenant payments:", err);
          setPayments([]);
        });
    } catch (e) {
      console.error(e);
      setPayments([]);
    }
  };

  // פונקציה שמנקה מחרוזות לצורך חיפוש
  const cleanString = (str) => {
    try {
      return String(str ?? "")
        .normalize("NFKD")
        .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
        .replace(/\s+/g, "")
        .trim()
        .toLowerCase();
    } catch (e) {
      console.error(e);
      return "";
    }
  };

  const applyFilters = useCallback(() => {
    try {
      let result = payments;

      if (filters.status) {
        const q = cleanString(filters.status);
        result = result.filter((p) => cleanString(p?.status) === q);
      }

      if (filters.fromDate) {
        const from = new Date(filters.fromDate).setHours(0, 0, 0, 0);
        result = result.filter((p) => new Date(p.payment_date).setHours(0, 0, 0, 0) >= from);
      }

      if (filters.toDate) {
        const to = new Date(filters.toDate).setHours(0, 0, 0, 0);
        result = result.filter((p) => new Date(p.payment_date).setHours(0, 0, 0, 0) <= to);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      result = [...result].sort((a, b) => {
        const da = Math.abs(new Date(a.payment_date).setHours(0, 0, 0, 0) - today);
        const db = Math.abs(new Date(b.payment_date).setHours(0, 0, 0, 0) - today);
        return da - db;
      });

      setFilteredPayments(result);
    } catch (e) {
      console.error(e);
      setFilteredPayments([]);
    }
  }, [payments, filters]);

  useEffect(() => {
    try {
      applyFilters();
    } catch (e) {
      console.error(e);
    }
  }, [filters, payments, applyFilters]);

  // פונקציה שמוחקת תשלום של הדייר
  const handleDelete = (paymentId) => {
    try {
      if (!window.confirm("האם אתה בטוח שברצונך למחוק את התשלום?")) return;

      const params = new URLSearchParams();
      if (tenantId != null) params.append("tenant_id", String(tenantId));
      if (tenantBuildingId != null) params.append("building_id", String(tenantBuildingId));

      const url = `http://localhost:8801/api/tenant/payments/${paymentId}?${params.toString()}`;

      fetch(url, { method: "DELETE" })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert("לא ניתן למחוק (אולי כבר אושר ע\"י מנהל)");
            console.error("delete failed:", data);
            return;
          }
          fetchPayments();
        })
        .catch((err) => console.error("Error deleting payment:", err));
    } catch (e) {
      console.error(e);
    }
  };

  // פונקציה שמעדכנת תשלום של הדייר
  const handleEdit = (updatedPayment) => {
    try {
      fetch(`http://localhost:8801/api/tenant/payments/${updatedPayment.payment_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedPayment,
          tenant_id: tenantId,
          building_id: tenantBuildingId,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert("לא ניתן לערוך (אולי כבר אושר ע\"י מנהל)");
            console.error("patch failed:", data);
            return;
          }
          fetchPayments();
        })
        .catch((err) => {
          console.error("❌ שגיאת חיבור לשרת:", err);
          alert("בעיה בחיבור לשרת");
        });
    } catch (e) {
      console.error(e);
    }
  };

  const totalPaid = filteredPayments.reduce((s, p) => s + (p.status === "שולם" ? Number(p.amount) : 0), 0);
  const openDebts = filteredPayments.reduce((s, p) => s + (p.status !== "שולם" ? Number(p.amount) : 0), 0);
  const debtTenants = filteredPayments.filter((p) => p.status !== "שולם").map((p) => p.tenant_name);

  return (
    <FormWithTableLayout
      title="הוספת תשלומים"
      formComponent={<AddPaymentTenant onAdd={fetchPayments} />}
      summaryComponent={
        <div className={classes.summaryCards}>
          <div className={classes.card}>
            💰 סה״כ גבייה: <b>{totalPaid.toLocaleString()} ₪</b>
          </div>
          <div className={classes.card}>
            ❌ חובות פתוחים: <b>{openDebts.toLocaleString()} ₪</b>
          </div>
          <div className={classes.card}>
            🧍‍♂️ תשלומים לא משולמים: <b>{debtTenants.length}</b>
          </div>
        </div>
      }
      tableComponent={
        <>
          <div className={classes.filtersRow}>
            <div className={classes.rowLine}>
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

          <PaymentsTableTenant payments={filteredPayments} onEdit={handleEdit} onDelete={handleDelete} />
        </>
      }
      plainTableArea
      compact
      wrapperClassName={classes.tightTop}
    />
  );
}
