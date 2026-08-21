import React from 'react';
import { Order, OrderStatus } from '../../types';

interface ManufacturePanelProps {
    order: Order;
    onUpdateStatus: (status: OrderStatus) => void;
}

export const ManufacturePanel: React.FC<ManufacturePanelProps> = ({ order, onUpdateStatus }) => {
    return (
        <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors">
            <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest mb-6 text-indigo-600 transition-colors">Panel de Fabricación</h3>
            <div className="text-muted-foreground text-sm transition-colors">
                <p>Fase: <span className="text-foreground font-bold transition-colors">{order.orderStatus}</span></p>
                {/* Specs Viewer here */}
            </div>
        </section>
    );
};
