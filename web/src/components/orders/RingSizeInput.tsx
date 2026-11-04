import React from 'react';

interface RingSizeInputProps { value: string; onChange: (value: string) => void; required?: boolean; }
const RING_SIZES = Array.from({ length: 30 }, (_, i) => String(i + 1));

const RingSizeInput: React.FC<RingSizeInputProps> = ({ value, onChange, required = true }) => {
    const normalized = String(value || '').replace(/\s*CM$/i, '').trim();
    const isPreset = RING_SIZES.includes(normalized);
    return <div className="space-y-2">
        <select value={isPreset ? normalized : (normalized ? '__CUSTOM__' : '')} onChange={(e) => onChange(e.target.value === '__CUSTOM__' ? '' : e.target.value)} required={required && !normalized} className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none">
            <option value="">Seleccionar talla...</option>
            {RING_SIZES.map(size => <option key={size} value={size}>Talla {size}</option>)}
            <option value="__CUSTOM__">Otra talla (capturar)</option>
        </select>
        {!isPreset && <input value={value} onChange={e => onChange(e.target.value)} required={required} inputMode="decimal" placeholder="Captura la talla del anillo" className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none" />}
    </div>;
};

export default RingSizeInput;
