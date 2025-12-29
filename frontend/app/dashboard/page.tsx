export default function DashboardPage() {
    const stats = [
        { label: "Valor en Producción", value: "$1,245,000", change: "+12%" },
        { label: "Margen Promedio", value: "42%", change: "+2%" },
        { label: "Pedidos Activos", value: "24", change: "Estable" },
        { label: "Entregas este Mes", value: "18", change: "+5" },
    ];

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-3xl font-light tracking-tight">Vista Ejecutiva</h1>
                <p className="text-zinc-500 text-sm mt-1">Control center para Luxury OS</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
                        <p className="text-xs uppercase tracking-widest text-zinc-600 font-semibold">{stat.label}</p>
                        <div className="mt-2 flex items-baseline justify-between">
                            <h3 className="text-2xl font-semibold">{stat.value}</h3>
                            <span className="text-[10px] text-zinc-400">{stat.change}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-2xl h-80 flex flex-col justify-between">
                    <h4 className="text-sm uppercase tracking-widest text-zinc-500">Distribución por Etapa</h4>
                    <div className="flex-1 flex items-center justify-center italic text-zinc-700">
                        [Gráfico de Embudo en Desarrollo]
                    </div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-2xl h-80 flex flex-col justify-between">
                    <h4 className="text-sm uppercase tracking-widest text-zinc-500">Próximas Entregas</h4>
                    <ul className="space-y-4 mt-6">
                        <li className="flex justify-between text-sm">
                            <span className="text-zinc-400">Anillo Diamante - Eduardo M.</span>
                            <span className="text-white">12 Ene</span>
                        </li>
                        <li className="flex justify-between text-sm border-t border-zinc-900 pt-4">
                            <span className="text-zinc-400">Reloj Platinum - Sofía V.</span>
                            <span className="text-white">15 Ene</span>
                        </li>
                        <li className="flex justify-between text-sm border-t border-zinc-900 pt-4">
                            <span className="text-zinc-400">Brazalete Oro - Araceli R.</span>
                            <span className="text-white">18 Ene</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
