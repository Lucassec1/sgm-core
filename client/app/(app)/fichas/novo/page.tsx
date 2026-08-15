import { FichaForm } from '@/components/fichas/ficha-form';

export default function NovaFichaPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold mb-6">Nova Ficha</h1>
      <FichaForm />
    </div>
  );
}
