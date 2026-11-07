import { PageHeader } from '@/components/page-header';
import { FichaCasalForm } from '@/components/fichas/ficha-casal-form';

export default function NovoCasalPage() {
  return (
    <div className="max-w-3xl space-y-6 p-6">
      <PageHeader title="Novo casal" />
      <FichaCasalForm />
    </div>
  );
}
