import React from 'react';
import { Order, OrderStatus } from '../../types';

interface ManufacturePanelProps {
    order: Order;
    onUpdateStatus: (status: OrderStatus) => void;
}

export const ManufacturePanel: React.FC<ManufacturePanelProps> = ({ order, onUpdateStatus }) => {
    return (
        <section className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900 rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors">
            <h3 className="text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-widest mb-6 text-indigo-600 dark:text-indigo-400 transition-colors">Panel de Fabricación</h3>
            <div className="text-zinc-500 dark:text-zinc-400 text-sm transition-colors">
                <p>Fase: <span className="text-zinc-900 dark:text-white font-bold transition-colors">{order.orderStatus}</span></p>
                {/* Specs Viewer here */}
            </div>
        </section>
    );
};
