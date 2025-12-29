export default function ClientsPage() {
    const clients = [
        { name: "Sofía Villalobos", email: "sofia.v@example.com", pieces: 4, value: "$850,000" },
        { name: "Eduardo Mondragón", email: "edu.m@example.com", pieces: 2, value: "$180,000" },
        { name: "Araceli Ruiz", email: "araceli.r@example.com", pieces: 7, value: "$420,000" },
        { name: "Constanza de la Vega", email: "connie.v@example.com", pieces: 1, value: "$95,000" },
        { name: "Mauricio Garcíadiego", email: "mau.g@example.com", pieces: 3, value: "$120,000" },
    ];

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-light tracking-tight">Directorio de Clientes</h1>
                    <p className="text-zinc-500 text-sm mt-1">Gestión de relaciones exclusivas</p>
                </div>
                <button className="bg-white text-black px-6 py-2 rounded-lg text-xs uppercase tracking-widest font-semibold hover:bg-zinc-200 transition-colors">
                    Nuevo Cliente
                </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-zinc-900 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                            <th className="px-8 py-5 font-bold">Cliente</th>
                            <th className="px-8 py-5 font-bold">Piezas</th>
                            <th className="px-8 py-5 font-bold">Valor Total</th>
                            <th className="px-8 py-5 font-bold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                        {clients.map((client) => (
                            <tr key={client.email} className="hover:bg-zinc-900/50 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="text-sm font-medium text-zinc-200">{client.name}</div>
                                    <div className="text-xs text-zinc-600">{client.email}</div>
                                </td>
                                <td className="px-8 py-5 text-sm text-zinc-400">{client.pieces}</td>
                                <td className="px-8 py-5 text-sm font-mono text-white">{client.value}</td>
                                <td className="px-8 py-5 text-right">
                                    <button className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                                        Ver Perfil
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
