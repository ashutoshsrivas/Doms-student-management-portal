'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Roadmap dialogs render into <body>. The full-screen canvas is portalled
// too, so a dialog left inside the page tree would open behind it — which
// made milestones look unclickable from the canvas.
export default function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  // the marker lets the canvas know a dialog is open, so Escape closes the
  // dialog's own layer first rather than the canvas underneath it
  return createPortal(<div data-roadmap-dialog="">{children}</div>, document.body);
}
