import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ label, value, icon: Icon, color, trend }: any) => {
  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
    amber: 'text-amber-600 bg-amber-50'
  };
  
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#F1F5F9] rounded-[12px] shadow-sm p-6 flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-300">
      <div>
        <div className="flex items-center gap-2 text-[#64748B] mb-4">
          <Icon className="w-4 h-4 stroke-[1.5px]" />
          <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">{label}</span>
        </div>
        <h3 className="text-[#1E293B] text-2xl font-bold font-mono tracking-tighter">
          {value}
        </h3>
      </div>
      <div className="mt-4 flex items-center gap-2">
         {trend !== undefined && (
           <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
             {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
             {Math.abs(trend).toFixed(1)}%
           </div>
         )}
      </div>
    </motion.div>
  );
};

export const Input = React.forwardRef<HTMLInputElement, any>(({ label, ...props }, ref) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      ref={ref}
      {...props}
      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
    />
  </div>
));
Input.displayName = 'Input';
