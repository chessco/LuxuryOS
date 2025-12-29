
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";

const InventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAIValuation = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Como experto tasador de joyas, analiza esta pieza y dame una descripción de marketing de lujo y una breve opinión sobre su valor de mercado actual: Solitario Diamante Corte Brillante, 2.05 Carat, VVS1, Oro Blanco 18k. SKU: DIA-0042-X.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      setAiInsight(response.text || "No se pudo generar el análisis.");
    } catch (error) {
      console.error("AI Valuation Error:", error);
      setAiInsight("Error al conectar con el servicio de tasación inteligente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <header className="bg-background-dark/80 backdrop-blur-md border-b border-card-border shrink-0 z-10">
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link className="hover:text-white transition-colors flex items-center gap-1" to="/inventory">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Inventario
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{id}</span>
          </div>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h2 className="text-white text-2xl font-bold tracking-tight">Solitario Diamante Corte Brillante</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wide">Activo</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={generateAIValuation}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[18px] ${isGenerating ? 'animate-spin' : 'icon-fill'}`}>
                  {isGenerating ? 'autorenew' : 'auto_awesome'}
                </span>
                <span>{isGenerating ? 'Analizando...' : 'Tasación Inteligente'}</span>
              </button>
              <button className="flex items-center gap-2 bg-card-dark hover:bg-slate-700 border border-card-border text-white px-4 py-2 rounded-lg font-medium text-sm transition-all">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Editar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="aspect-square w-full rounded-xl bg-gradient-to-br from-[#1e2430] to-[#151a25] border border-card-border flex items-center justify-center overflow-hidden relative group">
              <span className="material-symbols-outlined text-[120px] text-indigo-300/30 group-hover:scale-110 transition-transform duration-500">diamond</span>
            </div>
            
            {/* AI Insight Card */}
            {aiInsight && (
              <div className="bg-gradient-to-br from-primary/20 to-indigo-900/20 border border-primary/30 rounded-xl p-6 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="absolute top-0 right-0 p-3 opacity-20">
                  <span className="material-symbols-outlined text-4xl text-primary">auto_awesome</span>
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary icon-fill">neurology</span>
                  Análisis de IA
                </h4>
                <div className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-primary/40 pl-4">
                  {aiInsight}
                </div>
                <p className="mt-4 text-[9px] text-slate-500 text-right">Generado por Gemini AI • Tasación estimada</p>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              <div className="aspect-square rounded-lg bg-card-dark border-2 border-primary overflow-hidden flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-indigo-300">diamond</span>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-square rounded-lg bg-card-dark border border-card-border flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-slate-700">image</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PriceCard label="Precio Venta" value="$12,500" />
              <PriceCard label="Costo Interno" value="$7,200" />
              <PriceCard label="Margen" value="42.4%" trend />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card-dark border border-card-border rounded-xl p-6">
                <h3 className="text-white font-bold text-lg mb-6 border-b border-card-border pb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500">info</span> Información General
                </h3>
                <div className="space-y-5">
                  <PropRow label="SKU" value="DIA-0042-X" isMono />
                  <PropRow label="Categoría" value="Anillos" isBadge />
                  <PropRow label="Colección" value="Invierno Eterna 2023" />
                  <PropRow label="Proveedor" value="Gemstones Int. Ltd" isLink />
                  <PropRow label="Fecha Ingreso" value="12 Oct, 2023" />
                </div>
              </div>

              <div className="bg-card-dark border border-card-border rounded-xl p-6">
                <h3 className="text-white font-bold text-lg mb-6 border-b border-card-border pb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500">inventory_2</span> Estado de Inventario
                </h3>
                <div className="space-y-5">
                  <PropRow label="Ubicación" value="Bóveda Principal" hasLock />
                  <PropRow label="En Mano" value="3" isBig />
                  <PropRow label="Reservados" value="0" />
                  <PropRow label="Punto Reorden" value="2 unidades" />
                  <div className="pt-2">
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card-dark border border-card-border rounded-xl p-6">
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500">diamond</span> Especificaciones
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <SpecItem label="Metal" value="Oro Blanco 18k" />
                <SpecItem label="Peso" value="2.05 Carat" />
                <SpecItem label="Claridad" value="VVS1" />
                <SpecItem label="Corte" value="Brillante" />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Esta pieza presenta un diamante central certificado por GIA (Cert #221345). El diseño del solitario es minimalista para resaltar el brillo de la piedra central. 
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const PriceCard: React.FC<{ label: string, value: string, trend?: boolean }> = ({ label, value, trend }) => (
  <div className="p-5 rounded-xl bg-card-dark border border-card-border">
    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</p>
    <div className="flex items-center gap-2">
      <span className={`text-3xl font-bold tracking-tight ${trend ? 'text-emerald-400' : 'text-white'}`}>{value}</span>
      {trend && <span className="material-symbols-outlined text-emerald-400 text-lg">trending_up</span>}
    </div>
  </div>
);

const PropRow: React.FC<{ label: string, value: string, isMono?: boolean, isBadge?: boolean, isLink?: boolean, hasLock?: boolean, isBig?: boolean }> = ({ label, value, isMono, isBadge, isLink, hasLock, isBig }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-500 text-sm">{label}</span>
    <div className="flex items-center gap-2">
      {hasLock && <span className="material-symbols-outlined text-xs text-amber-500">lock</span>}
      <span className={`
        ${isMono ? 'font-mono' : ''} 
        ${isBadge ? 'text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded text-xs border border-indigo-500/20' : ''}
        ${isLink ? 'text-primary' : 'text-white'}
        ${isBig ? 'text-xl font-bold' : 'text-sm font-medium'}
      `}>
        {value}
      </span>
    </div>
  </div>
);

const SpecItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="p-3 bg-background-dark/50 rounded-lg border border-card-border">
    <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">{label}</p>
    <p className="text-white text-sm">{value}</p>
  </div>
);

export default InventoryDetail;
