import React from "react";
import classes from "./FormWithTableLayout.module.css";

/**
 * תבנית פריסה לטופס + טבלה.
 * ברירת מחדל: כרטיס בז’ לטופס, כרטיס לבן לטבלה (כמו היום).
 * אפשר לכבות את הכרטיס של הטבלה (plainTableArea) רק בעמודים שצריך,
 * בלי לפגוע בשאר הדפים.
 */
export default function FormWithTableLayout({
  title,
  formComponent,
  tableComponent,

  /** מחלקות אופציונליות לאוברריידים מקומיים */
  wrapperClassName = "",
  formClassName = "",
  tableClassName = "",

  /** “שטוח” – מבטל רקע/צל/ריפוד בצד הטבלה (למשל בתשלומים) */
  plainTableArea = false,

  /** אם תרצה גם לטופס */
  plainFormArea = false,

  /** עטיפה קומפקטית יותר (לא חובה) */
  compact = false,
}) {
  const wrapperCls = [
    classes.layoutWrapper,
    compact ? classes.compactWrapper : "",
    wrapperClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const formCls = [
    classes.formArea,
    plainFormArea ? classes.plainFormArea : "",
    formClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const tableCls = [
    classes.tableArea,
    plainTableArea ? classes.plainTableArea : "",
    tableClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperCls}>
      {/* Form section (Right) */}
      <div className={formCls}>
        {title ? <h1>{title}</h1> : null}
        {formComponent}
      </div>

      {/* Table section (Left) */}
      <div className={tableCls}>{tableComponent}</div>
    </div>
  );
}
