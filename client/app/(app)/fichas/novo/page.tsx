import { PageHeader } from '@/components/page-header';
import { FichaForm } from '@/components/fichas/ficha-form';

export default function NovaFichaPage() {
  return (
    <div className="max-w-3xl space-y-6 p-6">
      <PageHeader title="Nova ficha" />
      <FichaForm />
    </div>
  );
}
