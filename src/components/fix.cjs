
const fs = require("fs");
let code = fs.readFileSync("NfceDashboard.tsx", "utf8");

// The original chunk has weird unicode chars, so we use indexOf for a safer anchor.
const target = "{selectedProd && (";
const matchIdx = code.lastIndexOf(target);

if (matchIdx !== -1) {
    const endStr = "    </div>\n  );\n};\n";
    const endIdx = code.indexOf(endStr, matchIdx);
    
    if (endIdx !== -1) {
        const replacement = `                {selectedProd && (
                  <p className="text-xs text-blue-600 pl-1">? {selectedProd.descricao} — {Number(selectedProd.valorUnitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 uppercase text-sm font-bold">
           <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 flex-1">Cancelar</button>
           <button onClick={() => {}} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex-1">Salvar</button>
        </div>
      </div>
    </div>
  );
};
`;
        code = code.substring(0, matchIdx) + replacement + code.substring(endIdx + endStr.length);
        fs.writeFileSync("NfceDashboard.tsx", code);
        console.log("FIXED_SUCCESSFULLY");
    }
}

