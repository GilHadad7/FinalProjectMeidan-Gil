// ✅ קובץ 2: DetailsOfBuildingsPage.jsx – מציג בניין יחיד אם נשלח buildingId דרך location.state

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import BuildingsForm from "../components/BuildingsForm";
import BuildingsTable from "../components/BuildingsTable";
import classes from "./DetailsOfBuildingsPage.module.css";

export default function DetailsOfBuildingsPage() {
  const location = useLocation();
  const selectedBuildingId = location.state?.buildingId || null;

  const [buildings, setBuildings] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);

  // טוען מהשרת כל פעם שהרענון מתחלף
  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then(res => res.json())
      .then(data => {
        if (selectedBuildingId) {
          const filtered = data.filter(b => b.building_id === selectedBuildingId);
          setBuildings(filtered);
        } else {
          setBuildings(data);
        }
      })
      .catch(err => console.error("Error loading buildings:", err));
  }, [refreshFlag, selectedBuildingId]);

  const triggerRefresh = () => setRefreshFlag((prev) => !prev);

  return (
    <div className={classes.page}>
      <div className={classes.pageWrapper}>
        {/* ימין – טופס */}
        <div className={classes.leftPanel}>
          <BuildingsForm onSuccess={triggerRefresh} />
        </div>

        {/* שמאל – טבלה */}
        <div className={classes.rightPanel}>
          <h2 className={classes.pageTitle}>ניהול בניינים</h2>
          <BuildingsTable buildings={buildings} onDelete={triggerRefresh} />
        </div>
      </div>
    </div>
  );
}
