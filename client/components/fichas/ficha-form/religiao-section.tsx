'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { FichaFormValues } from './ficha-schema';
import { SectionTitle } from '../section-title';

export function ReligiaoSection({ bloqueado }: { bloqueado: boolean }) {
  const { register, watch, setValue } = useFormContext<FichaFormValues>();

  return (
    <section className="space-y-4">
      <SectionTitle>Religião</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="religiao">Religião</Label>
          <Input id="religiao" disabled={bloqueado} {...register('religiao')} />
        </div>
        <div>
          <Label htmlFor="igrejaQueFrequenta">Igreja que frequenta</Label>
          <Input id="igrejaQueFrequenta" disabled={bloqueado} {...register('igrejaQueFrequenta')} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Checkbox
            id="participaOutroMovimento"
            checked={watch('participaOutroMovimento')}
            onCheckedChange={(v) => setValue('participaOutroMovimento', !!v)}
            disabled={bloqueado}
          />
          <Label htmlFor="participaOutroMovimento">Participa de outro movimento da Igreja</Label>
        </div>
        {watch('participaOutroMovimento') && (
          <div className="col-span-2">
            <Label htmlFor="qualMovimento">Qual movimento</Label>
            <Input id="qualMovimento" disabled={bloqueado} {...register('qualMovimento')} />
          </div>
        )}
        <div className="col-span-2 space-y-2">
          <Label>Sacramentos recebidos</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sacramentoBatismo"
              checked={watch('sacramentoBatismo')}
              onCheckedChange={(v) => setValue('sacramentoBatismo', !!v)}
              disabled={bloqueado}
            />
            <Label htmlFor="sacramentoBatismo" className="font-normal">
              Batismo
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sacramentoEucaristia"
              checked={watch('sacramentoEucaristia')}
              onCheckedChange={(v) => setValue('sacramentoEucaristia', !!v)}
              disabled={bloqueado}
            />
            <Label htmlFor="sacramentoEucaristia" className="font-normal">
              Eucaristia
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sacramentoCrisma"
              checked={watch('sacramentoCrisma')}
              onCheckedChange={(v) => setValue('sacramentoCrisma', !!v)}
              disabled={bloqueado}
            />
            <Label htmlFor="sacramentoCrisma" className="font-normal">
              Crisma
            </Label>
          </div>
        </div>
      </div>
    </section>
  );
}
