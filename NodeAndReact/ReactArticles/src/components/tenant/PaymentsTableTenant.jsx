import React, { useMemo } from "react";
import classes from "./PaymentsTableTenant.module.css";
import BaseTable from "../../components/ui/BaseTable";

export default function PaymentsTableTenant({ payments }) {
  // === מיון מהחדש לישן ===
  const sortedPayments = useMemo(() => {
    const list = Array.isArray(payments) ? [...payments] : [];
    return list.sort((a, b) => {
      const ta = Date.parse(a.payment_date);
      const tb = Date.parse(b.payment_date);
      if (isNaN(ta) && isNaN(tb)) return 0;
      if (isNaN(ta)) return 1;
      if (isNaN(tb)) return -1;
      return tb - ta;
    });
  }, [payments]);

  return (
    <div className={classes.tableWrapper}>
      <BaseTable
        headers={[
          "שם דייר",
          "שם בניין",
          "סכום",
          "תאריך",
          "קטגוריה",
          "תיאור",
          "סטטוס",
        ]}
        plainContainer
        containerStyle={{ background: "transparent", boxShadow: "none", padding: 0 }}
      >
        {sortedPayments.length === 0 ? (
          <tr>
            <td colSpan="7" style={{ textAlign: "center" }}>לא נמצאו תשלומים</td>
          </tr>
        ) : (
          sortedPayments.map((p) => (
            <tr key={p.payment_id}>
              <td>{p.tenant_name}</td>
              <td>{p.building_name}</td>
              <td>{Number(p.amount).toLocaleString()} ₪</td>
              <td>{new Date(p.payment_date).toLocaleDateString("he-IL")}</td>
              <td>{p.category}</td>
              <td>{p.description}</td>
              <td>
                <span
                  className={
                    p.status === "שולם"
                      ? classes.statusPaid
                      : p.status === "חוב"
                      ? classes.statusDebt
                      : classes.statusPending
                  }
                >
                  {p.status}
                </span>
              </td>
            </tr>
          ))
        )}
      </BaseTable>
    </div>
  );
}
