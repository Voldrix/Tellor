<?php
if(empty($_REQUEST['api'])) {
  http_response_code(400);
  exit();
}
$scon = new mysqli('localhost', 'telloruser', 'tellorpasswd', 'tellordb');
$scon->set_charset('utf8mb4');
header("Cache-Control: no-store");

switch ($_REQUEST['api']) {
  case 'getBoards': getBoards(); break;
  case 'getBoard': getBoard(); break;
  case 'newBoard': newBoard(); break;
  case 'editBoard': editBoard(); break;
  case 'addList': addList(); break;
  case 'renameList': renameList(); break;
  case 'moveList': moveList(); break;
  case 'newCard': newCard(); break;
  case 'addTag': addTag(); break;
  case 'getCard': getCard(); break;
  case 'saveCard': saveCard(); break;
  case 'moveCard': moveCard(); break;
  case 'deleteList': deleteList(); break;
  case 'delTag': delTag(); break;
  case 'archiveCard': archiveCard(); break;
  case 'deleteBoard': deleteBoard(); break;
  case 'export': export(); break;
  case 'import': import(); break;
  default: http_response_code(400);
}
$scon->close();


function getBoards() { //Get Boards
  global $scon;
  $res = $scon->query('SELECT * FROM boards');
  if(!empty($res) && mysqli_num_rows($res) > 0) {
    $rows = mysqli_fetch_all($res, MYSQLI_ASSOC);
    echo json_encode($rows);
  }
  else echo '[]';
}


function getCard() { //Get Card
  global $scon;
  $res = $scon->query('SELECT * FROM cards WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['cardid'].'" LIMIT 1');
  if(!empty($res) && mysqli_num_rows($res) == 1) {
    $row = mysqli_fetch_assoc($res);
    echo json_encode($row);
  }
  else echo '[]';
}


function getBoard() { //Get Board (lists + cards)
  global $scon;
  $resL = $scon->query('SELECT id,color,name,ordr FROM lists WHERE board="'.$_REQUEST['bid'].'" ORDER BY ordr asc');
  $resC = $scon->query('SELECT list,id,parent,title,tags,cdate,mdate,description FROM cards WHERE board="'.$_REQUEST['bid'].'"');
  $rowsL = mysqli_fetch_all($resL, MYSQLI_ASSOC);
  $rowsC = mysqli_fetch_all($resC, MYSQLI_ASSOC);
  $res = new stdClass();
  $res->lists = $rowsL;
  $res->cards = $rowsC;
  echo json_encode($res);
}


function newBoard() { //New Board
  global $scon;
  $bid = substr(str_shuffle(MD5(microtime())), 0, 16);
  $name = $_REQUEST['name'];
  if(preg_match("/[\\\"<&]/", $name)) {http_response_code(400); return;}

  $sq = $scon->prepare('INSERT INTO boards(id,name,bgimg) VALUES(?,?,?)');
  $sq->bind_param('sss', $bid, $name, $_REQUEST['imgurl']);
  $sq->execute();
  $sq->close();

  if($sq) echo $bid;
  else http_response_code(500);
}


function editBoard() { //Edit Board
  global $scon;
  $name = $_REQUEST['name'];
  if(preg_match("/[\\\"<&]/", $name)) {http_response_code(400); return;}

  $sq = $scon->prepare('UPDATE boards SET name=?,bgimg=? WHERE id=?');
  $sq->bind_param('sss', $name, $_REQUEST['imgurl'], $_REQUEST['bid']);
  $sq->execute();
  $sq->close();

  if(!$sq) http_response_code(500);
}


function addList() { //Add List
  global $scon;
  $lid = substr(str_shuffle(MD5(microtime())), 0, 16);

  $sq = $scon->prepare('INSERT INTO lists(board,id,color,name,ordr) VALUES("'.$_REQUEST['bid'].'","'.$lid.'",null,?,'.$_REQUEST['pos'].')');
  $sq->bind_param('s', $_REQUEST['name']);
  $sq->execute();
  $sq->close();

  if($sq) echo $lid;
  else http_response_code(500);
}


function renameList() { //Rename List
  global $scon;
  $sq = $scon->prepare('UPDATE lists SET name=? WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['lid'].'" LIMIT 1');
  $sq->bind_param('s', $_REQUEST['title']);
  $sq->execute();
  $sq->close();

  if(!$sq) http_response_code(500);
}


function moveList() { //Move List
  global $scon;
  $res = $scon->query('UPDATE lists SET ordr="'.$_REQUEST['ordr2'].'" WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['lid1'].'" LIMIT 1');
  $res = $scon->query('UPDATE lists SET ordr="'.$_REQUEST['ordr1'].'" WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['lid2'].'" LIMIT 1');
  if(!$res)
    http_response_code(500);
}


function newCard() { //Add Card
  global $scon;
  $cardid = substr(str_shuffle(MD5(microtime())), 0, 16);
  $res = $scon->query('INSERT INTO cards(board,list,id,parent,title,tags,description) VALUES("'.$_REQUEST['bid'].'","'.$_REQUEST['listid'].'","'.$cardid.'","'.$_REQUEST['pid'].'","'.$_REQUEST['title'].'",null,null)');
  if($res) echo $cardid;
  else http_response_code(500);
}


function addTag() { //Add Tag
  global $scon;
  $color = $_REQUEST['color'];
  if(preg_match("/^[a-zA-Z0-9]+$/", $color) && strlen($color) < 7) {
    $res = $scon->query('UPDATE cards SET tags=CONCAT_WS(" ", tags, "'.$color.'") WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['cardid'].'" LIMIT 1');
    if(!$res) http_response_code(500);
  }
  else http_response_code(400);
}


function saveCard() { //Save Card
  global $scon;
  if($_SERVER['REQUEST_METHOD'] !== 'POST') {http_response_code(400); return;}
  $desc = file_get_contents('php://input');
  $sq = $scon->prepare('UPDATE cards SET title=?,description=? WHERE board=? AND id=? LIMIT 1');
  $sq->bind_param('ssss', $_REQUEST['title'], $desc, $_REQUEST['bid'], $_REQUEST['cardid']);
  $sq->execute();
  $sq->close();

  if(!$sq) http_response_code(500);
}


function moveCard() { //Move Card
  global $scon;
  if($_REQUEST['stid'] == $_REQUEST['dpid'] || $_REQUEST['stid'] == $_REQUEST['dtid']) {
    http_response_code(400);
    return;
  }
  //set src pid to dpid
  $scon->query('UPDATE cards SET parent="'.$_REQUEST['dpid'].'",list="'.$_REQUEST['dlid'].'" WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['stid'].'" LIMIT 1');
  //set dest pid to src id
  if($_REQUEST['dtid'] != '0')
    $scon->query('UPDATE cards SET parent="'.$_REQUEST['stid'].'" WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['dtid'].'" LIMIT 1');
  //set void pid to spid
  if($_REQUEST['vtid'] != '0')
    $scon->query('UPDATE cards SET parent="'.$_REQUEST['spid'].'" WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['vtid'].'" LIMIT 1');
}


function deleteList() { //Delete List
  global $scon;
  if($_SERVER['REQUEST_METHOD'] !== 'PUT') {http_response_code(400); return;}
  $res = $scon->query('INSERT INTO archive SELECT * FROM cards WHERE board="'.$_REQUEST['bid'].'" AND list="'.$_REQUEST['lid'].'"');
  $res = $scon->query('DELETE FROM cards WHERE board="'.$_REQUEST['bid'].'" AND list="'.$_REQUEST['lid'].'"');
  $res = $scon->query('DELETE FROM lists WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['lid'].'"');
  if(!$res) http_response_code(500);
}


function delTag() { //Delete Tag
  global $scon;
  if($_SERVER['REQUEST_METHOD'] !== 'PUT') {http_response_code(400); return;}
  $color = $_REQUEST['color'];
  $res = $scon->query('SELECT tags FROM cards WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['cardid'].'" LIMIT 1');
  if(empty($res) || mysqli_num_rows($res) != 1) {
    http_response_code(404);
    return;
  }
  $tag = mysqli_fetch_array($res)[0];
  $tag = preg_replace("/\b$color\b\s?/", '', $tag);
  $tag = trim($tag);
  $tag = empty($tag) ? 'null' : '"'.$tag.'"';

  $res = $scon->query('UPDATE cards SET tags='.$tag.' WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['cardid'].'" LIMIT 1');
  if(!$res) http_response_code(500);
}


function archiveCard() { //Archive Card
  global $scon;
  $res = $scon->query('UPDATE cards SET parent="'.$_REQUEST['pid'].'" WHERE board="'.$_REQUEST['bid'].'" AND parent="'.$_REQUEST['cardid'].'" LIMIT 1');
  $res = $scon->query('INSERT INTO archive SELECT * FROM cards WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['cardid'].'" LIMIT 1');
  $res = $scon->query('DELETE FROM cards WHERE board="'.$_REQUEST['bid'].'" AND id="'.$_REQUEST['cardid'].'" LIMIT 1');
  if(!$res)
    http_response_code(500);
}


function deleteBoard() { //Delete Board
  global $scon;
  if($_SERVER['REQUEST_METHOD'] !== 'PUT') {http_response_code(400); return;}
  $scon->query('DELETE FROM cards WHERE board="'.$_REQUEST['bid'].'"');
  $scon->query('DELETE FROM lists WHERE board="'.$_REQUEST['bid'].'"');
  $res = $scon->query('DELETE FROM boards WHERE id="'.$_REQUEST['bid'].'"');
  if(!$res) http_response_code(404);
}


function export() { //Export Board
  global $scon;
  $res = $scon->query('SELECT * FROM boards WHERE id="'.$_REQUEST['bid'].'"');
  if(empty($res) || mysqli_num_rows($res) != 1) {
    http_response_code(404);
    return;
  }
  $data = (object)mysqli_fetch_assoc($res);
  $resL = $scon->query('SELECT id,color,name,ordr FROM lists WHERE board="'.$_REQUEST['bid'].'" ORDER BY ordr asc');
  $resC = $scon->query('SELECT list,id,parent,title,tags,cdate,mdate,description FROM cards WHERE board="'.$_REQUEST['bid'].'"');
  $rowsL = mysqli_fetch_all($resL, MYSQLI_ASSOC);
  $rowsC = mysqli_fetch_all($resC, MYSQLI_ASSOC);
  $data->lists = $rowsL;
  $data->cards = $rowsC;

  header('Content-Type: application/octet-stream');
  header('Content-Disposition: attachment; filename="tellor_'.$data->id.'.json"');
  echo json_encode($data);
}


function import() { //Import Board
  if($_SERVER['REQUEST_METHOD'] !== 'POST') {http_response_code(400); return;}
  $dataRaw = file_get_contents('php://input');
  $data = json_decode($dataRaw);
  if(!$data) {
    http_response_code(400);
    return;
  }
  if(isset($data->nodeId)) importTrello($data);
  else if(isset($data->name)) importTellor($data);
  else http_response_code(400);
}


function importTellor($data) { //Import Tellor
  global $scon;
  $res = $scon->query('INSERT INTO boards(id,name,bgimg) VALUES("'.$data->id.'","'.$data->name.'","'.$data->bgimg.'")');
  if(!$res) {http_response_code(500); return;}

  $sq = $scon->prepare('INSERT INTO lists(board,id,color,name,ordr) VALUES(?,?,?,?,?)');
  foreach($data->lists as $list) {
    $sq->bind_param('ssssi', $data->id, $list->id, $list->color, $list->name, $list->ordr);
    $sq->execute();
  }
  $sq->close();
  $sq = $scon->prepare('INSERT INTO cards VALUES(?,?,?,?,?,?,?,?,?)');
  foreach($data->cards as $card) {
    $sq->bind_param('sssssssss', $data->id, $card->list, $card->id, $card->parent, $card->title, $card->tags, $card->cdate, $card->mdate, $card->description);
    $sq->execute();
  }
  $sq->close();
  echo $data->id;
}


function importTrello($data) { //Import Trello
  global $scon;
  $colorCodes = array("black" => "000000", "silver" => "C0C0C0", "gray" => "808080", "white" => "FFFFFF", "maroon" => "800000", "red" => "FF0000", "purple" => "800080", "fuchsia" => "FF00FF", "green" => "008000", "lime" => "00FF00", "olive" => "808000", "yellow" => "FFFF00", "navy" => "000080", "blue" => "0000FF", "teal" => "008080", "aqua" => "00FFFF");

  $bid = substr(str_shuffle(MD5(microtime())), 0, 16);
  $boardName = str_replace(['\\','"','<','\n'], '', $data->name);
  $res = $scon->query('INSERT INTO boards(id,name,bgimg) VALUES("'.$bid.'","'.$boardName.'","'.$data->perfs->backgroundImage.'")');
  if(!$res) {http_response_code(500); return;}

  usort($data->cards, function($a, $b) {return $a->pos - $b->pos;});

  $sqlCards = $scon->prepare('INSERT INTO cards VALUES(?,?,?,?,?,?,default,?,?)');
  $sqlLists = $scon->prepare('INSERT INTO lists(board,id,color,name,ordr) VALUES(?,?,?,?,?)');

  foreach($data->lists as $list) {
    if($list->closed) continue;
    $lid = substr(str_shuffle(MD5(microtime())), 0, 16);
    $sqlLists->bind_param('ssssi', $bid, $lid, $list->color, $list->name, $list->pos);
    $sqlLists->execute();

    $pid = "0";
    foreach($data->cards as $card) {
      if($card->closed || $card->idList	!== $list->id) continue;
      $cid = substr(str_shuffle(MD5(microtime())), 0, 16);

      $tags = "";
      foreach($card->labels as $label) {
        if(empty($label->color)) continue;
        if(str_starts_with($label->color, '#'))
          $tag = substr($label->color, 1);
        else
          $tag = $colorCodes[$label->color];
        if($tag)
          $tags .= $tag . ' ';
      }
      $tags = trim($tags);

      $sqlCards->bind_param('ssssssss', $bid, $lid, $cid, $pid, $card->name, $tags, $card->dateLastActivity, $card->desc);
      $sqlCards->execute();
      $pid = $cid;
    }
  }

  $sqlLists->close();
  $sqlCards->close();
  echo $bid;
}

?>
