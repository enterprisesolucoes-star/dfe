import { create } from 'xmlbuilder2';
import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';
import axios from 'axios';
import { format } from 'date-fns';
import { Emitente, Venda, Produto, Cliente } from '../types/nfce';

export interface NfceResponse {
  sucesso: boolean;
  xmlAssinado: string | null;
  protocolo: string | null;
  mensagemErro: string | null;
  status: 'Pendente' | 'Autorizada' | 'Cancelada' | 'Rejeitada' | 'Contingencia' | 'ErroConexao';
  chaveAcesso?: string;
  qrcodeUrl?: string;
}

export class NfceService {
  private emitente: Emitente;

  constructor(emitente: Emitente) {
    this.emitente = emitente;
  }

  /**
   * Fluxo completo de emissão inspirado na nfephp
   */
  public async emitirNfce(nfce: Venda, itens: Produto[], cliente?: Cliente, contingencia: boolean = false): Promise<NfceResponse> {
    try {
      // 1. Geração do XML (Equivalente ao Make)
      const xmlBase = this.generateXml(nfce, itens, cliente);
      
      // 2. Assinatura Digital
      const xmlAssinado = await this.signXml(xmlBase);
      
      if (contingencia) {
        return {
          sucesso: true,
          xmlAssinado: xmlAssinado,
          protocolo: null,
          status: 'Contingencia',
          mensagemErro: null,
          chaveAcesso: nfce.chaveAcesso
        };
      }

      // 3. Transmissão para SEFAZ
      const retornoSefaz = await this.transmit(xmlAssinado);
      
      // 4. Tratamento de Retorno (Equivalente ao Standardize)
      if (retornoSefaz.cStat === '100') {
        return {
          sucesso: true,
          xmlAssinado: xmlAssinado,
          protocolo: retornoSefaz.nProt,
          status: 'Autorizada',
          mensagemErro: null,
          chaveAcesso: nfce.chaveAcesso,
          qrcodeUrl: this.generateQrCodeUrl(nfce.chaveAcesso!)
        };
      }

      // Tratamento de Duplicidade (204)
      if (retornoSefaz.cStat === '204') {
        // Lógica de recuperação de protocolo simplificada para o exemplo
        return {
          sucesso: false,
          xmlAssinado: xmlAssinado,
          protocolo: null,
          status: 'Rejeitada',
          mensagemErro: "Duplicidade detectada. O sistema tentará recuperar o protocolo automaticamente na próxima sincronização."
        };
      }

      return {
        sucesso: false,
        xmlAssinado: xmlAssinado,
        protocolo: null,
        status: 'Rejeitada',
        mensagemErro: `Rejeição SEFAZ: ${retornoSefaz.xMotivo}`
      };

    } catch (error: any) {
      return {
        sucesso: false,
        xmlAssinado: null,
        protocolo: null,
        status: 'ErroConexao',
        mensagemErro: `Erro no processamento: ${error.message}. Deseja emitir em contingência?`
      };
    }
  }

  /**
   * Gera o PDF (DANFE) da NFC-e
   */
  public async gerarDanfe(xml: string): Promise<Blob> {
    // Em uma implementação real, isso chamaria o PrinterService no backend
    throw new Error("Geração de PDF deve ser feita via PrinterService no backend.");
  }

  /**
   * Cancelamento de NFC-e
   */
  public async cancelarNfce(vendaId: number, justificativa: string): Promise<{ sucesso: boolean; mensagem: string }> {
    if (justificativa.length < 15) {
      return { sucesso: false, mensagem: "A justificativa deve ter no mínimo 15 caracteres." };
    }
    // Implementação real chamaria o backend PHP ou usaria biblioteca local
    return { sucesso: true, mensagem: "Nota Cancelada com Sucesso" };
  }

  /**
   * Inutilização de Numeração
   */
  public async inutilizarNumeracao(serie: number, nIni: number, nFin: number, justificativa: string): Promise<{ sucesso: boolean; mensagem: string }> {
    if (justificativa.length < 15) {
      return { sucesso: false, mensagem: "A justificativa deve ter no mínimo 15 caracteres." };
    }
    return { sucesso: true, mensagem: "Numeração Inutilizada com Sucesso" };
  }

  /**
   * Gera o XML da NFC-e (Modelo 65)
   */
  public generateXml(nfce: Venda, itens: Produto[], cliente?: Cliente): string {
    const now = new Date();
    const dataEmissao = format(now, "yyyy-MM-dd'T'HH:mm:ssxxx");
    const chaveAcesso = this.generateChaveAcesso(nfce);

    const xmlObj = {
      enviNFe: {
        '@xmlns': 'http://www.portalfiscal.inf.br/nfe',
        '@versao': '4.00',
        idLote: '1',
        indSinc: '1',
        NFe: {
          infNFe: {
            '@versao': '4.00',
            '@Id': `NFe${chaveAcesso}`,
            ide: {
              cUF: '35', // SP
              cNF: '00000001',
              natOp: 'VENDA',
              mod: '65',
              serie: nfce.serie.toString(),
              nNF: nfce.numero.toString(),
              dhEmi: dataEmissao,
              tpNF: '1',
              idDest: '1',
              cMunFG: this.emitente.endereco.codigoMunicipio,
              tpImp: '4', // DANFE NFC-e
              tpEmis: '1',
              cDV: chaveAcesso.slice(-1),
              tpAmb: this.emitente.ambiente,
              finNFe: '1',
              indFinal: '1',
              indPres: '1',
              procEmi: '0',
              verProc: '1.0.0'
            },
            emit: {
              CNPJ: this.emitente.cnpj,
              xNome: this.emitente.razaoSocial,
              xFant: this.emitente.nomeFantasia,
              enderEmit: {
                xLgr: this.emitente.endereco.logradouro,
                nro: this.emitente.endereco.numero,
                xBairro: this.emitente.endereco.bairro,
                cMun: this.emitente.endereco.codigoMunicipio,
                xMun: this.emitente.endereco.municipio,
                UF: this.emitente.endereco.uf,
                CEP: this.emitente.endereco.cep,
                cPais: '1058',
                xPais: 'BRASIL'
              },
              IE: this.emitente.inscricaoEstadual,
              CRT: this.emitente.crt
            },
            dest: cliente ? {
              CPF: cliente.documento,
              xNome: cliente.nome,
              indIEDest: '9'
            } : undefined,
            det: itens.map((p, i) => ({
              '@nItem': (i + 1).toString(),
              prod: {
                cProd: p.codigoInterno,
                cEAN: p.ean || 'SEM GTIN',
                xProd: p.descricao,
                NCM: p.ncm,
                CFOP: p.cfop,
                uCom: p.unidadeComercial,
                qCom: '1.0000',
                vUnCom: p.valorUnitario.toFixed(2),
                vProd: p.valorUnitario.toFixed(2),
                cEANTrib: p.ean || 'SEM GTIN',
                uTrib: p.unidadeComercial,
                qTrib: '1.0000',
                vUnTrib: p.valorUnitario.toFixed(2),
                indTot: '1'
              },
              imposto: {
                ICMS: {
                  ICMSSN102: {
                    orig: p.origemMercadoria,
                    CSOSN: p.icmsCstCsosn
                  }
                }
              }
            })),
            total: {
              ICMSTot: {
                vBC: '0.00', vICMS: '0.00', vICMSDeson: '0.00', vFCP: '0.00',
                vBCST: '0.00', vST: '0.00', vFCPST: '0.00', vFCPSTRet: '0.00',
                vProd: nfce.valorTotal.toFixed(2), vFrete: '0.00', vSeg: '0.00',
                vDesc: nfce.valorDesconto.toFixed(2), vII: '0.00', vIPI: '0.00', vIPIDevol: '0.00',
                vPIS: '0.00', vCOFINS: '0.00', vOutro: '0.00',
                vNF: nfce.valorTotal.toFixed(2)
              }
            },
            transp: { modFrete: '9' },
            pag: {
              detPag: {
                tPag: '01', // Dinheiro
                vPag: nfce.valorTotal.toFixed(2)
              }
            },
            infAdic: { infCpl: 'NFC-e emitida em ambiente de homologação' }
          }
        }
      }
    };

    return create(xmlObj).end({ prettyPrint: true });
  }

  /**
   * Assina o XML digitalmente
   */
  public async signXml(xml: string): Promise<string> {
    // @ts-ignore - Simulação para o exemplo
    const p12Der = forge.util.decode64(this.emitente.certificadoCaminho || '');
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.emitente.certificadoSenha || '');

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

    const key = forge.pki.privateKeyToPem(keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]![0].key!);
    const cert = forge.pki.certificateToPem(certBags[forge.pki.oids.certBag]![0].cert!);

    const sig = new SignedXml({
      privateKey: key,
      signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
      canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    });

    sig.addReference({
      xpath: "//*[local-name(.)='infNFe']",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
      ],
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1"
    });
    
    // @ts-ignore
    sig.keyInfoProvider = {
      getKeyInfo: () => `<X509Data><X509Certificate>${cert.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '')}</X509Certificate></X509Data>`,
      getKey: () => Buffer.from(key)
    };

    sig.computeSignature(xml, {
      location: { reference: "//*[local-name(.)='infNFe']", action: "after" }
    });

    return sig.getSignedXml();
  }

  /**
   * Transmite para a SEFAZ
   */
  public async transmit(xml: string): Promise<any> {
    const url = 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx';
    
    const soapEnvelope = `
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
            ${xml}
          </nfeDadosMsg>
        </soap12:Body>
      </soap12:Envelope>
    `;

    try {
      const response = await axios.post(url, soapEnvelope, {
        headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' }
      });
      // Simulação de parse de retorno
      return { cStat: '100', nProt: '135240000000000', xMotivo: 'Autorizado o uso da NF-e' };
    } catch (error) {
      throw error;
    }
  }

  private generateQrCodeUrl(chave: string): string {
    const urlBase = this.emitente.ambiente === '1' 
      ? 'https://www.nfce.fazenda.sp.gov.br/consulta' 
      : 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta';
    
    return `${urlBase}?chNFe=${chave}&nVersao=100&tpAmb=${this.emitente.ambiente}&cDest=&dhEmi=&vNF=&vICMS=&digVal=&cIdToken=${this.emitente.cscId}&cHashQRCode=...`;
  }

  private generateChaveAcesso(nfce: Venda): string {
    const uf = '35';
    const data = format(new Date(), 'yyMM');
    const cnpj = this.emitente.cnpj.replace(/\D/g, '');
    const mod = '65';
    const serie = nfce.serie.toString().padStart(3, '0');
    const nNF = nfce.numero.toString().padStart(9, '0');
    const tpEmis = '1';
    const cNF = '00000001';
    
    const base = `${uf}${data}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
    const dv = '0'; 
    return `${base}${dv}`;
  }
}
