import { FichaCasalForm } from '@/components/fichas/ficha-casal-form';

export default function NovoCasalPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold mb-6">Novo Casal</h1>
      <FichaCasalForm />
    </div>
  );
}
