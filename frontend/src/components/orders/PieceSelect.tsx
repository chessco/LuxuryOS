import React, { useState, useEffect, useRef } from 'react';

export const STANDARD_PIECES = [
    'Cadena',
    'Esclava',
    'Dije',
    'Arracadas',
    'Arete',
    'Anillo',
    'Diamante',
    'Reloj',
] as const;

export interface PieceSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    selectClassName?: string;
    required?: boolean;
    disabled?: boolean;
}

export const PieceSelect: React.FC<PieceSelectProps> = ({
    value,
    onChange,
    className = '',
    selectClassName = '',
    required = false,
    disabled = false
}) => {
    // Normalizar búsqueda en opciones estándar (insensible a mayúsculas/minúsculas)
    const findStandard = (val: string) => {
        const trimmed = (val || '').trim().toLowerCase();
        if (!trimmed) return undefined;
        return STANDARD_PIECES.find(p => p.toLowerCase() === trimmed);
    };

    // Almacenar el valor manual original si existía al cargar
    const initialCustomRef = useRef<string>(
        (!findStandard(value) && value?.trim()) ? value.trim() : ''
    );

    // Si el valor cambia externamente a otro valor personalizado que no sea estándar
    useEffect(() => {
        const std = findStandard(value);
        if (!std && value?.trim() && !initialCustomRef.current) {
            initialCustomRef.current = value.trim();
        }
    }, [value]);

    const [isOtherActive, setIsOtherActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Si el usuario activa "Otro", enfocamos el input
    useEffect(() => {
        if (isOtherActive) {
            inputRef.current?.focus();
        }
    }, [isOtherActive]);

    const currentStandard = findStandard(value);
    const legacyValue = initialCustomRef.current;

    // Determinar qué opción debe reflejar el <select>
    let selectValue = '';
    if (isOtherActive) {
        selectValue = '__OTRO__';
    } else if (currentStandard) {
        selectValue = currentStandard;
    } else if (legacyValue && value?.trim().toLowerCase() === legacyValue.toLowerCase()) {
        selectValue = '__LEGACY__';
    } else if (value?.trim()) {
        selectValue = legacyValue ? '__LEGACY__' : '__OTRO__';
    }

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = e.target.value;
        if (selected === '__OTRO__') {
            setIsOtherActive(true);
            onChange('');
        } else if (selected === '__LEGACY__') {
            setIsOtherActive(false);
            onChange(legacyValue);
        } else if (selected === '') {
            setIsOtherActive(false);
            onChange('');
        } else {
            // Se seleccionó una de las opciones estándar
            setIsOtherActive(false);
            onChange(selected);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const isCustom = !currentStandard && Boolean(value?.trim());
    const showTextInput = isOtherActive || isCustom;
    const isLegacy = !isOtherActive && isCustom && Boolean(legacyValue);

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="relative">
                <select
                    value={selectValue}
                    onChange={handleSelectChange}
                    disabled={disabled}
                    required={required && !showTextInput}
                    className={`w-full bg-muted/50 border border-border rounded-xl py-3 pl-4 pr-10 text-sm text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all shadow-inner [color-scheme:light] dark:[color-scheme:dark] ${selectClassName}`}
                >
                    <option value="" className="bg-card text-foreground">
                        Seleccionar pieza...
                    </option>

                    {STANDARD_PIECES.map((piece) => (
                        <option key={piece} value={piece} className="bg-card text-foreground">
                            {piece}
                        </option>
                    ))}

                    {legacyValue && (
                        <option value="__LEGACY__" className="bg-card text-amber-500 font-medium">
                            {legacyValue} (Capturado a mano)
                        </option>
                    )}

                    <option value="__OTRO__" className="bg-card text-foreground">
                        Otro
                    </option>
                </select>

                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60 flex items-center">
                    <span className="material-symbols-outlined text-[18px]">unfold_more</span>
                </div>
            </div>

            {showTextInput && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={value || ''}
                            onChange={handleInputChange}
                            placeholder="Escribe el tipo de pieza..."
                            disabled={disabled}
                            required={required}
                            className="w-full bg-muted/70 border border-indigo-500/40 focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all shadow-inner"
                        />
                        {value && (
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground flex items-center justify-center transition-colors"
                                title="Borrar texto"
                            >
                                <span className="material-symbols-outlined text-[12px]">close</span>
                            </button>
                        )}
                    </div>

                    {isLegacy ? (
                        <p className="text-[10px] text-amber-500 dark:text-amber-400 font-medium px-1 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px]">info</span>
                            Valor capturado a mano en versión anterior. Puedes editarlo o elegir una opción del listado arriba.
                        </p>
                    ) : (
                        <p className="text-[10px] text-muted-foreground px-1">
                            Ingresa el nombre personalizado de la pieza.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default PieceSelect;
