// src/components/ui/BaseTable.jsx
import React from "react";
import classes from "./BaseTable.module.css";

export default function BaseTable({
  headers = [],
  children,

  /** נשאר לתאימות לאחור – מוחל על <table> עצמו */
  className = "",

  /** שם מחלקה לעטיפה החיצונית (לא חובה) */
  containerClassName = "",

  /** שם מחלקה נוסף לטבלה (אופציונלי) */
  tableClassName = "",

  /** אלמנט שיוצב מימין מעל הטבלה (חיפוש/כפתור וכו') */
  topRight = null,

  /** מערך רוחבי עמודות, למשל: ["24%","22%","10%","12%","12%","8%","6%","6%"] */
  colWidths = [],

  /** כותרת דביקה בגלילה */
  stickyHeader = false,

  /** מבטל את הפאנל הלבן של ה-Container מבפנים (לא פוגע בדפים אחרים) */
  plainContainer = false,

  /** שליטה ידנית ב-inline style אם צריך */
  containerStyle = {},
  tableStyle = {},
}) {
  const tableCls = `${classes.table} ${className} ${tableClassName}`.trim();
  const containerCls = `${classes.tableContainer} ${containerClassName}`.trim();

  // אם ביקשו plain – ננטרל רקע/צל/ריפוד בעטיפה באמצעות inline style
  const mergedContainerStyle = plainContainer
    ? { background: "transparent", boxShadow: "none", padding: 0, ...containerStyle }
    : containerStyle;

  return (
    <div className={containerCls} style={mergedContainerStyle}>
      {topRight && <div className={classes.topRight}>{topRight}</div>}

      <table className={tableCls} style={tableStyle}>
        {Array.isArray(colWidths) && colWidths.length > 0 && (
          <colgroup>
            {headers.map((_, i) => (
              <col key={i} style={{ width: colWidths[i] || "auto" }} />
            ))}
          </colgroup>
        )}

        <thead className={stickyHeader ? classes.stickyHead : ""}>
          <tr>
            {headers.map((h, idx) => (
              <th key={idx}>{h}</th>
            ))}
          </tr>
        </thead>

        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
