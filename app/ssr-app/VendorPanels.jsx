'use client';

import RequirementsPanel from './RequirementsPanel';
import styles from './company/workspace.module.css';

export function CompaniesPanel() {
  return <section className={styles.inner}>
    <div className={styles.sectionHead}><h1>Company Administration</h1></div>
    <p role="status">Coming in V2.</p>
  </section>;
}

export function TokensPanel(props) {
  return <RequirementsPanel {...props} />;
}
