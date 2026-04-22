<?php

namespace App\Services;

use NFePHP\DA\NFe\Danfce;
use Exception;

/**
 * Service Class para geração de DANFE NFC-e (Modelo 65)
 * @author Senior Backend Developer
 */
class PrinterService
{
    protected $logoPath;
    protected $config;

    public function __construct(array $config, string $logoPath = '')
    {
        $this->config = $config;
        $this->logoPath = $logoPath;
    }

    /**
     * Gera o PDF da NFC-e em formato de bobina (80mm)
     * 
     * @param string $xmlAutorizado XML assinado e protocolado
     * @return string Conteúdo do PDF (binário)
     */
    public function imprimirNfce(string $xmlAutorizado): string
    {
        try {
            // A biblioteca Danfce da NFePHP já lida com o QR Code se o XML estiver protocolado
            // e as chaves CSC estiverem na config do Tools (ou passadas aqui)
            
            $danfce = new Danfce($xmlAutorizado, $this->logoPath, 4); // 4 = DANFE NFC-e
            
            // Configurações de impressão para bobina 80mm
            $danfce->monta();
            
            // Retorna o PDF como string para ser enviado ao navegador ou salvo
            return $danfce->render();
            
        } catch (Exception $e) {
            throw new Exception("Erro ao gerar DANFE: " . $e->getMessage());
        }
    }
}
