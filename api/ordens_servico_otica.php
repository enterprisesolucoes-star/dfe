<?php
$empresa_id = $_SESSION['empresa_id'] ?? 1;
switch ($action) {
  case 'listar_os_otica':
    $di = $_GET['data_inicio'] ?? date('Y-m-01');
    $df = $_GET['data_fim'] ?? date('Y-m-d');
    $stmt = $pdo->prepare("SELECT o.*, r.longe_od_esferico,r.longe_od_cilindrico,r.longe_od_eixo,r.longe_od_dnp,r.longe_od_altura,r.longe_oe_esferico,r.longe_oe_cilindrico,r.longe_oe_eixo,r.longe_oe_dnp,r.longe_oe_altura,r.perto_od_esferico,r.perto_od_cilindrico,r.perto_od_eixo,r.perto_od_dnp,r.perto_od_altura,r.perto_od_adicao,r.perto_oe_esferico,r.perto_oe_cilindrico,r.perto_oe_eixo,r.perto_oe_dnp,r.perto_oe_altura,r.perto_oe_adicao,r.d_maior,r.horizontal,r.vertical,r.ponte,r.tipo_armacao,r.laboratorio,r.observacoes AS receita_obs FROM ordens_servico_otica o LEFT JOIN ordens_servico_otica_receita r ON r.os_id=o.id WHERE o.empresa_id=? AND DATE(o.created_at) BETWEEN ? AND ? ORDER BY o.id DESC");
    $stmt->execute([$empresa_id,$di,$df]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $recCols = ['longe_od_esferico','longe_od_cilindrico','longe_od_eixo','longe_od_dnp','longe_od_altura','longe_oe_esferico','longe_oe_cilindrico','longe_oe_eixo','longe_oe_dnp','longe_oe_altura','perto_od_esferico','perto_od_cilindrico','perto_od_eixo','perto_od_dnp','perto_od_altura','perto_od_adicao','perto_oe_esferico','perto_oe_cilindrico','perto_oe_eixo','perto_oe_dnp','perto_oe_altura','perto_oe_adicao','d_maior','horizontal','vertical','ponte','tipo_armacao','laboratorio'];
    foreach ($rows as &$os) {
      $si=$pdo->prepare("SELECT * FROM ordens_servico_otica_itens WHERE os_id=? ORDER BY id"); $si->execute([$os['id']]); $os['itens']=$si->fetchAll(PDO::FETCH_ASSOC);
      $os['receita']=array_merge(array_fill_keys($recCols,''),['observacoes'=>$os['receita_obs']??'']);
      foreach($recCols as $k){$os['receita'][$k]=$os[$k]??''; unset($os[$k]);} unset($os['receita_obs']);
    } unset($os);
    echo json_encode($rows); break;

  case 'salvar_os_otica':
    $d=json_decode(file_get_contents('php://input'),true);
    $id=(int)($d['id']??0); $itens=$d['itens']??[]; $rec=$d['receita']??[];
    try {
      $pdo->beginTransaction();
      if($id>0){
        $pdo->prepare("UPDATE ordens_servico_otica SET cliente_id=?,cliente_nome=?,cliente_doc=?,cliente_fone=?,vendedor_id=?,status=?,previsao=?,observacoes=?,total=?,updated_at=NOW() WHERE id=? AND empresa_id=?")
          ->execute([$d['cliente_id']?:null,$d['cliente_nome']??'',$d['cliente_doc']??'',$d['cliente_fone']??'',$d['vendedor_id']?:null,$d['status']??'Rascunho',$d['previsao']?:null,$d['observacoes']??'',(float)($d['total']??0),$id,$empresa_id]);
      } else {
        $max=$pdo->prepare("SELECT COALESCE(MAX(numero),0)+1 FROM ordens_servico_otica WHERE empresa_id=?"); $max->execute([$empresa_id]); $num=(int)$max->fetchColumn();
        $pdo->prepare("INSERT INTO ordens_servico_otica (empresa_id,numero,cliente_id,cliente_nome,cliente_doc,cliente_fone,vendedor_id,status,previsao,observacoes,total) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
          ->execute([$empresa_id,$num,$d['cliente_id']?:null,$d['cliente_nome']??'',$d['cliente_doc']??'',$d['cliente_fone']??'',$d['vendedor_id']?:null,$d['status']??'Rascunho',$d['previsao']?:null,$d['observacoes']??'',(float)($d['total']??0)]);
        $id=(int)$pdo->lastInsertId();
      }
      $pdo->prepare("DELETE FROM ordens_servico_otica_itens WHERE os_id=?")->execute([$id]);
      foreach($itens as $it) $pdo->prepare("INSERT INTO ordens_servico_otica_itens (os_id,tipo,produto_id,descricao,unidade,quantidade,valor_unitario,valor_total) VALUES (?,?,?,?,?,?,?,?)")->execute([$id,$it['tipo']??'servico',$it['produto_id']?:null,$it['descricao']??'',$it['unidade']??'UN',(float)($it['quantidade']??1),(float)($it['valor_unitario']??0),(float)($it['valor_total']??0)]);
      if(!empty($rec)){
        $cols=['longe_od_esferico','longe_od_cilindrico','longe_od_eixo','longe_od_dnp','longe_od_altura','longe_oe_esferico','longe_oe_cilindrico','longe_oe_eixo','longe_oe_dnp','longe_oe_altura','perto_od_esferico','perto_od_cilindrico','perto_od_eixo','perto_od_dnp','perto_od_altura','perto_od_adicao','perto_oe_esferico','perto_oe_cilindrico','perto_oe_eixo','perto_oe_dnp','perto_oe_altura','perto_oe_adicao','d_maior','horizontal','vertical','ponte','tipo_armacao','laboratorio','observacoes'];
        $ph=implode(',',array_fill(0,count($cols),'?')); $upd=implode(',',array_map(fn($c)=>"$c=VALUES($c)",$cols)); $vals=array_map(fn($c)=>$rec[$c]??null,$cols);
        $pdo->prepare("INSERT INTO ordens_servico_otica_receita (os_id,$ph) VALUES (?,$ph) ON DUPLICATE KEY UPDATE $upd")->execute(array_merge([$id],$vals,$vals));
      }
      $pdo->commit(); echo json_encode(['success'=>true,'id'=>$id]);
    } catch(Exception $e){ $pdo->rollBack(); echo json_encode(['success'=>false,'message'=>$e->getMessage()]); }
    break;

  case 'excluir_os_otica':
    $d=json_decode(file_get_contents('php://input'),true); $id=(int)($d['id']??0);
    if(!$id){echo json_encode(['success'=>false,'message'=>'ID inválido']);break;}
    $pdo->prepare("DELETE FROM ordens_servico_otica WHERE id=? AND empresa_id=?")->execute([$id,$empresa_id]);
    echo json_encode(['success'=>true]); break;

  case 'emitir_nfce_os': case 'emitir_nfe_os':
    echo json_encode(['success'=>false,'message'=>'Integração NF pendente de configuração.']); break;
}
