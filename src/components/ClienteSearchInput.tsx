import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { Cliente } from '../types/nfce';

interface Props {
  value: Cliente | null;
  onChange: (cliente: Cliente | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const ClienteSearchInput: React.FC<Props> = ({
  value,
  onChange,
  placeholder = "Digite nome ou CPF/CNPJ...",
  label,
  required = false,
}) => {
  const { clientes, fetchClientes } = useAppData();
  const [busca, setBusca] = useState('');
  const [showDrop, setShowDrop] = useState(false);

  const handleChange = (v: string) => {
    setBusca(v);
    setShowDrop(true);
    clearTimeout((window as any)._clienteSearchTimer);
    if (v.length === 0) fetchClientes('');
    else if (v.length >= 2) {
      (window as any)._clienteSearchTimer = setTimeout(() => fetchClientes(v), 400);
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-gray-700 rounded-xl">
        <span className="flex-1 text-sm font-bold text-indigo-800 dark:text-indigo-200">
          {value.nome}
          {value.documento && <span className="ml-2 text-xs font-normal text-indigo-500"> · {value.documento}</span>}
        </span>
        <button onClick={() => { onChange(null); setBusca(''); }}
          className="text-indigo-400 hover:text-red-500 text-lg leading-none">×</button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-[10px] font-bold text-indigo-500 uppercase">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { setShowDrop(true); if (!busca) fetchClientes(''); }}
          onBlur={() => setTimeout(() => setShowDrop(false), 200)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {showDrop && clientes.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-52 overflow-y-auto">
            {clientes.slice(0, 10).map(c => (
              <button key={c.id} onMouseDown={() => { onChange(c); setBusca(''); setShowDrop(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{c.nome}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{c.documento || 'Sem documento'} {c.endereco?.municipio ? `· ${c.endereco.municipio}/${c.endereco.uf}` : ''}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
