import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    options: string[]; // Simple string options for now
    placeholder?: string;
    icon?: string;
    required?: boolean;
    name?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ value, onChange, options, placeholder, icon, required, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        onChange(inputValue);

        if (inputValue.length > 0) {
            const filtered = options.filter(opt =>
                opt.toLowerCase().includes(inputValue.toLowerCase()) && opt !== inputValue
            ).slice(0, 5); // Limit to 5 suggestions
            setFilteredOptions(filtered);
            setIsOpen(true);
        } else {
            setFilteredOptions([]);
            setIsOpen(false);
        }
    };

    const handleSelectOption = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    const handleFocus = () => {
        if (value.length > 0) {
            const filtered = options.filter(opt =>
                opt.toLowerCase().includes(value.toLowerCase()) && opt !== value
            ).slice(0, 5);
            setFilteredOptions(filtered);
            setIsOpen(true);
        } else {
            // Optionally show recent or recommended if empty? For now, nothing.
            // Or let's show top 5 options if empty to help discovery
            setFilteredOptions(options.slice(0, 5));
            setIsOpen(true);
        }
    };

    return (
        <div ref={wrapperRef} className="relative group">
            {icon && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors pointer-events-none z-10">
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </span>
            )}
            <input
                ref={inputRef}
                name={name}
                value={value}
                onChange={handleInputChange}
                onFocus={handleFocus}
                className={`w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 ${icon ? 'pl-12' : 'pl-4'} pr-4 text-sm text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700 shadow-sm`}
                placeholder={placeholder}
                required={required}
                autoComplete="off"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => { onChange(''); inputRef.current?.focus(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            )}

            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <ul className="max-h-48 overflow-y-auto no-scrollbar py-1">
                        {filteredOptions.map((option, index) => (
                            <li key={index}>
                                <button
                                    type="button"
                                    onClick={() => handleSelectOption(option)}
                                    className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px] text-zinc-600">search</span>
                                    <span>{option}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default AutocompleteInput;
