'use client';

import RequirementsPanel from './RequirementsPanel';
import styles from '../company/workspace.module.css';

export { CompaniesPanel } from '../VendorPanels';

export function TokensPanel(props) {
  return <RequirementsPanel {...props} />;
}
