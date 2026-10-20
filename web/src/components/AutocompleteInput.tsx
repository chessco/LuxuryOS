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
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        onChange(inputValue);

        if (inputValue.length > 0) {
            const filtered = options.filter(opt =>
                opt.toLowerCase().includes(inputValue.toLowerCase())
            ).slice(0, 8); // Limit to 8 suggestions
            setFilteredOptions(filtered);
            setIsOpen(filtered.length > 0);

            // Auto-fire selection on exact match so parent can load client info
            const exactMatch = options.find(opt => opt.toLowerCase() === inputValue.toLowerCase());
            if (exactMatch && exactMatch !== inputValue) {
                onChange(exactMatch);
            }
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
                opt.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 8);
            setFilteredOptions(filtered);
            setIsOpen(filtered.length > 0);
        } else {
            setFilteredOptions(options.slice(0, 8));
            setIsOpen(true);
        }
    };

    return (
        <div ref={wrapperRef} className="relative group transition-colors">
            {icon && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-white transition-colors pointer-events-none z-10">
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </span>
            )}
            <input
                ref={inputRef}
                name={name}
                value={value}
                onChange={handleInputChange}
                onFocus={handleFocus}
                className={`w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 ${icon ? 'pl-12' : 'pl-4'} pr-4 text-base sm:text-sm text-zinc-900 dark:text-white focus:border-indigo-500/50 dark:focus:border-white focus:outline-none transition-all placeholder-zinc-300 dark:placeholder-zinc-700 shadow-sm`}
                placeholder={placeholder}
                required={required}
                autoComplete="off"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => { onChange(''); inputRef.current?.focus(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            )}

            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 transition-colors">
                    <ul className="max-h-48 overflow-y-auto no-scrollbar py-1">
                        {filteredOptions.map((option, index) => (
                            <li key={index}>
                                <button
                                    type="button"
                                    onClick={() => handleSelectOption(option)}
                                    className="w-full text-left px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px] text-zinc-400 dark:text-zinc-600 transition-colors">search</span>
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
