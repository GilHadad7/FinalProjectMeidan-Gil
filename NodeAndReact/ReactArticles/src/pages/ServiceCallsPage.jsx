// src/pages/ServiceCallsPage.jsx
import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import ServiceCallForm from "../components/ServiceCallForm";
import ServiceCallsTable from "../components/ServiceCallsTable";
import FormWithTableLayout from "../components/ui/FormWithTableLayout";
import FiltersBar from "../components/ui/FiltersBar";
import styles from "./ServiceCallsPage.module.css";

export default function ServiceCallsPage() {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const role = user?.role;

  const [refreshFlag, setRefreshFlag] = useState(false);
  const triggerRefresh = () => setRefreshFlag((prev) => !prev);

  const [filters, setFilters] = useState({
    building: "",
    status: "",
    service_type: "",
  });

  // <<< NEW: קורא את הפרמטר מה־URL ומכין אותו עבור הטבלה
  const { search } = useLocation();
  const highlightId = useMemo(() => {
    const p = new URLSearchParams(search);
    const id = p.get("highlight");
    return id && id !== "undefined" ? id : "";
  }, [search]);

  const filterBar = (
    <FiltersBar className={styles.filtersBar}>
      <input
        type="text"
        className={`${styles.grow} ${styles.searchInput}`}
        placeholder=" חפש לפי כתובת, משתמש שפתח                      🔎 "
        value={filters.building}
        onChange={(e) => setFilters({ ...filters, building: e.target.value })}
        aria-label="🔎 חיפוש לפי כתובת, סוג תקלה או משתמש שפתח" 
      />
      <select
        value={filters.service_type}
        onChange={(e) => setFilters({ ...filters, service_type: e.target.value })}
      >
        <option value="">סוג תקלה</option>
        <option value="חשמל">חשמל</option>
        <option value="נזילה">נזילה</option>
        <option value="תקלה טכנית">תקלה טכנית</option>
        <option value="אינסטלציה">אינסטלציה</option>
        <option value="נזק">נזק</option>
        <option value="אחר">אחר</option>
      </select>
      <select
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="">סטטוס</option>
        <option value="Open">פתוח</option>
        <option value="Closed">סגור</option>
      </select>
    </FiltersBar>
  );

  return (
    <FormWithTableLayout
      title="קריאות שירות"
      formComponent={<ServiceCallForm role={role} onSuccess={triggerRefresh} />}
      tableComponent={
        <>
          {filterBar}
          <ServiceCallsTable
            role={role}
            refreshFlag={refreshFlag}
            setRefreshFlag={setRefreshFlag}
            filters={filters}
            highlightId={highlightId}  // <<< NEW: מעביר לטבלה
          />
        </>
      }
    />
  );
}
