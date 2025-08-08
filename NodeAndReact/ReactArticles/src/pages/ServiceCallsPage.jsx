// src/pages/ServiceCallsPage.jsx

import React, { useState } from "react";
import ServiceCallForm from "../components/ServiceCallForm";
import ServiceCallsTable from "../components/ServiceCallsTable";
import FormWithTableLayout from "../components/ui/FormWithTableLayout";
import classes from "./ServiceCallsPage.module.css";

export default function ServiceCallsPage() {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const role = user?.role;

  const [refreshFlag, setRefreshFlag] = useState(false);
  const triggerRefresh = () => setRefreshFlag((prev) => !prev);

  // סינון לפי כתובת בניין, סטטוס וסוג תקלה
  const [filters, setFilters] = useState({
    building: "",
    status: "",
    service_type: "",
  });

  const filterInputs = (
    <div className={classes.filtersRow}>
      <input
        type="text"
        placeholder="כתובת בניין"
        value={filters.building}
        onChange={(e) =>
          setFilters({ ...filters, building: e.target.value })
        }
      />
      <select
        value={filters.service_type}
        onChange={(e) =>
          setFilters({ ...filters, service_type: e.target.value })
        }
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
        onChange={(e) =>
          setFilters({ ...filters, status: e.target.value })
        }
      >
        <option value="">סטטוס</option>
        <option value="Open">פתוח</option>
        <option value="Closed">סגור</option>
      </select>
    </div>
  );

  return (
    <FormWithTableLayout
      title="קריאות שירות"
      formComponent={<ServiceCallForm role={role} onSuccess={triggerRefresh} />}
      tableComponent={
        <>
          {filterInputs}
          <ServiceCallsTable
            role={role}
            refreshFlag={refreshFlag}
            setRefreshFlag={setRefreshFlag}
            filters={filters}
          />
        </>
      }
    />
  );
}
