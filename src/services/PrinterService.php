<?php

namespace App\Services;

use NFePHP\DA\NFe\Danfce;
use NFePHP\DA\NFe\Danfe;
use NFePHP\DA\NFe\Daevento;
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
            
            // Retorna o PDF como string para ser enviado ao navegador ou salvo
            return $danfce->render();
            
        } catch (\Throwable $e) {
            throw new Exception("Erro ao gerar DANFE: " . $e->getMessage() . " / " . $e->getFile() . ":" . $e->getLine());
        }
    }

    /**
     * Gera o PDF da NF-e (Modelo 55)
     * 
     * @param string $xmlAutorizado XML assinado e protocolado
     * @return string Conteúdo do PDF (binário)
     */
    public function imprimirNfe(string $xmlAutorizado): string
    {
        try {
            $danfe = new Danfe($xmlAutorizado, 'P', 'A4', $this->logoPath);
            // Algumas versões usam a propriedade abaixo para não imprimir o email nas informacoes complementares
            if (property_exists($danfe, 'printEmail')) {
                $danfe->printEmail = false;
            }
            if (property_exists($danfe, 'mododebug')) {
                $danfe->mododebug = false;
            }
            // render('', 'S') retorna o PDF como string binária
            return $danfe->render('', 'S');
        } catch (\Throwable $e) {
            throw new Exception("Erro ao gerar DANFE NFe: " . $e->getMessage() . " / " . $e->getFile() . ":" . $e->getLine() . " / TRACE: " . $e->getTraceAsString());
        }
    }

    public function imprimirCce(string $xmlCCe, string $xmlNFe = ''): string
    {
        try {
            $dados = [
                'razao' => $this->config['razao_social'] ?? '',
                'logradouro' => $this->config['logradouro'] ?? '',
                'numero' => $this->config['numero'] ?? '',
                'bairro' => $this->config['bairro'] ?? '',
                'CEP' => $this->config['cep'] ?? '',
                'municipio' => $this->config['municipio'] ?? '',
                'UF' => $this->config['uf'] ?? '',
                'telefone' => $this->config['telefone'] ?? '',
                'email' => $this->config['email'] ?? '',
                'IE' => $this->config['inscricao_estadual'] ?? ''
            ];
            $daevento = new Daevento($xmlCCe, $dados);
            $daevento->debugMode(false);
            if (!empty($this->logoPath) && file_exists($this->logoPath)) {
                $daevento->logoParameters($this->logoPath, 'L');
            }
            return $daevento->render();
        } catch (\Throwable $e) {
            throw new Exception("Erro ao gerar CCe PDF: " . $e->getMessage());
        }
    }

}
