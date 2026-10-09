import type { Metadata } from 'next';
import { ReactNode } from 'react';

// Its own title, separate from the DOMS portal.
export const metadata: Metadata = {
  title: 'Exams Portal',
  description: 'Question bank and question paper generation',
};

export default function ExamsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
