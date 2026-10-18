import React, { useState, useEffect, useRef } from 'react';

export interface SelectWithOtherProps {
    name?: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly string[] | string[];
    placeholder?: string;
    otherPlaceholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    selectClassName?: string;
}

export const SelectWithOther: React.FC<SelectWithOtherProps> = ({
    name,
    value,
    onChange,
    options,
    placeholder = 'Seleccionar...',
    otherPlaceholder = 'Especificar otro...',
    required = false,
    disabled = false,
    className = 'space-y-2',
    selectClassName = 'w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all'
}) => {
    // Verificar si el valor actual coincide con alguna de las opciones predefinidas
    const isStandard = options.some(
        opt => opt.toLowerCase().trim() === (value || '').toLowerCase().trim()
    );
    const isCustomValue = Boolean(value?.trim()) && !isStandard;

    const [isOtherSelected, setIsOtherSelected] = useState<boolean>(isCustomValue || value === 'Otros' || value === 'Otro');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (value && !isStandard) {
            setIsOtherSelected(true);
        } else if (value && isStandard) {
            setIsOtherSelected(false);
        }
    }, [value, isStandard]);

    useEffect(() => {
        if (isOtherSelected) {
            inputRef.current?.focus();
        }
    }, [isOtherSelected]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === '__OTRO__') {
            setIsOtherSelected(true);
            onChange('');
        } else {
            setIsOtherSelected(false);
            onChange(val);
        }
    };

    let selectedOptionValue = '';
    if (isOtherSelected) {
        selectedOptionValue = '__OTRO__';
    } else if (isStandard) {
        const match = options.find(
            opt => opt.toLowerCase().trim() === (value || '').toLowerCase().trim()
        );
        selectedOptionValue = match || value;
    }

    return (
        <div className={className}>
            <div className="relative">
                <select
                    name={name}
                    value={selectedOptionValue}
                    onChange={handleSelectChange}
                    required={required && !isOtherSelected}
                    disabled={disabled}
                    className={selectClassName}
                >
                    <option value="">{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                    <option value="__OTRO__">Otros...</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground">
                    <span className="material-symbols-outlined text-base">unfold_more</span>
                </div>
            </div>

            {isOtherSelected && (
                <div className="relative flex items-center animate-in fade-in slide-in-from-top-1 duration-150">
                    <input
                        ref={inputRef}
                        type="text"
                        value={isStandard ? '' : value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={otherPlaceholder}
                        required={required}
                        disabled={disabled}
                        className="w-full bg-muted/70 border border-indigo-500/50 rounded-xl py-2.5 px-3.5 pr-9 text-sm text-foreground focus:border-indigo-500 outline-none transition-all placeholder:text-muted-foreground/60 shadow-inner"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setIsOtherSelected(false);
                            onChange('');
                        }}
                        className="absolute right-2.5 size-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                        title="Volver a opciones estándar"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SelectWithOther;
