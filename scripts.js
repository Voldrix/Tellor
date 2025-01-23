var boardID, boardsJSON, currentBoard, tags, lists, activeCard, listMax;
var tagPalette = ['900', 'F80', 'DD0', '090', '0DD', '00B', '80F', 'F08', 'E0E', 'F8F', '000', 'FFF', '888'];

const getCookie = (cookie) => (document.cookie.match('(^|;)\\s*'+cookie+'\\s*=\\s*([^;]+)')?.pop()||'');
function setCookie(cookie, value, del=false) {
  var date = new Date();
  if(del) date.setTime(1);
  else date.setTime(date.getTime() + (120*24*60*60*1000)); //120 days
  document.cookie = cookie + '=' + value + '; expires=' + date.toUTCString() + '; SameSite=Lax';
}


//STORY HOT LINK
var urlParams = new URLSearchParams(window.location.search);
var boardID = urlParams.get('b');


//READ COOKIES
if(document.cookie && !boardID) {
  boardID = getCookie('bid') || null;
}


getBoards();
if(boardID)
  changeBoard(boardID, true);
populateTagColors();


//POP STATE
window.onkeyup = (e) => {if(e.key === 'Escape') {closeCard();}};
window.onpopstate = function(event) {
  route('home');
  if(event.state)
    changeBoard(event.state, true);
  else
    document.title = 'Tellor';
};


//ROUTE
function route(_route) {
  if(_route === 'deleteBoard') {
    saveBoardBtn.style.display = delChk.checked ? 'none' : 'block';
    delBoardBtn.style.display = delChk.checked ? 'block' : 'none';
    return;
  }

  activeCard = 0;
  popupBG.style.display = 'none';
  newBoardBox.style.display = 'none';
  editBoardBox.style.display = 'none';
  importExportBox.style.display = 'none';
  viewCardBox.style.display = 'none';
  saveBoardBtn.style.display = 'block';
  delBoardBtn.style.display = 'none';
  delChk.checked = false;

  if(_route === 'newBoard') {
    popupBG.style.display = 'flex';
    newBoardBox.style.display = 'block';
    newBoardName.value = null;
    newbgimgurl.value = null;
    newBoardName.focus();
  }
  if(_route === 'editBoard') {
    if(!boardID) return;
    popupBG.style.display = 'flex';
    editBoardBox.style.display = 'block';
    boardName.value = currentBoard.name;
    bgimgurl.value = currentBoard.bgimg;
    boardName.focus();
  }
  if(_route === 'importExport') {
    popupBG.style.display = 'flex';
    importExportBox.style.display = 'block';
    importFile.disabled = false;
    loader.style.display = 'none';
  }
  if(_route === 'viewCard') {
    popupBG.style.display = 'flex';
    viewCardBox.style.display = 'block';
    tagsBox.innerHTML = '<button id=addTagBtn onclick=showTags()>+</button>';
    addTagBox.style.height = 0;
  }
}


//GET BOARDS
function getBoards() {
  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      boardsJSON = JSON.parse(this.responseText);
      for(b of boardsJSON) {
        let option = document.createElement("option");
        option.text = b.name;
        option.value = b.id;
        boardsSelect.appendChild(option);
        boards.innerHTML += `<a href="?b=${b.id}" onclick="event.preventDefault();changeBoard('${b.id}')">${b.name}</a>`;
      }
      if(boardID) {
        currentBoard = boardsJSON.find(e => e.id === boardID);
        boardsSelect.value = boardID;
        if(currentBoard) {
          history.replaceState(boardID, '', '?b=' + boardID);
          document.title = currentBoard.name + ' | Tellor';
          main.style.backgroundImage = currentBoard.bgimg ? 'url(' + currentBoard.bgimg + ')' : null;
        }
      }
    }
    else alert('Error: ' + this.status);
  }
  xhttp.open('GET', 'api.php?api=getBoards', true);
  xhttp.send();
}


//NEW BOARD
function newBoard() {
  var bname = newBoardName.value.trim();
  if(!bname || ['\\','"','<','&'].some(char => bname.includes(char))) {alert('Invalid Board Name\nIllegal Char: \\ " < &'); return;}

  var imgurl = newbgimgurl.value.trim();
  if(imgurl && !URL.canParse(imgurl)) {alert('Invalid URL'); return;}

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      let option = document.createElement("option");
      option.text = bname;
      option.value = this.responseText;
      boardsSelect.appendChild(option);
      boards.innerHTML += `<a href="?b=${this.responseText}" onclick="event.preventDefault();changeBoard('${this.responseText}')">${bname}</a>`;
      boardsJSON.push({id:this.responseText, name:bname, bgImg:imgurl});
      route('home');
      changeBoard(this.responseText);
    }
    else alert('Error: ' + this.status);
  }
  xhttp.open('GET', 'api.php?api=newBoard&name=' + encodeURI(bname) + '&imgurl=' + encodeURIComponent(imgurl), true);
  xhttp.send();
}


//EDIT BOARD
function editBoard() {
  var bname = boardName.value;
  if(!bname || ['\\','"','<','&'].some(char => bname.includes(char))) {alert('Invalid Board Name\nIllegal Char: \\ " < &'); return;}

  var imgurl = bgimgurl.value;
  if(imgurl && !URL.canParse(imgurl)) {alert('Invalid URL'); return;}

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      currentBoard.name = bname;
      currentBoard.bgimg = imgurl;
      route('home');
      var btn = boards.querySelector('a[href="?b='+boardID+'"');
      if(btn) btn.textContent = bname;
      btn = boardsSelect.querySelector('option[value="'+boardID+'"');
      if(btn) btn.textContent = bname;
      document.title = bname + ' | Tellor';
      main.style.backgroundImage = imgurl ? 'url(' + imgurl + ')' : null;
    }
    else alert('Error: ' + this.status);
  }
  xhttp.open('GET', 'api.php?api=editBoard&bid=' + boardID + '&name=' + encodeURI(bname) + '&imgurl=' + encodeURIComponent(imgurl), true);
  xhttp.send();
}


//CHANGE BOARD
function changeBoard(bid, popState=false) {
  if(!bid) return;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      boardID = bid;
      if(boardsJSON)
        currentBoard = boardsJSON.find(e => e.id === bid);
      boardsSelect.value = bid;
      var j = JSON.parse(this.responseText);
      lists = j.lists;
      render(bid, j.cards);
      setCookie('bid', bid, false);
      if(!popState)
        history.pushState(bid, '', '?b=' + bid);
      if(currentBoard)
        document.title = currentBoard.name + ' | Tellor';
      delete j.cards;
    }
    else alert('Error: ' + this.status);
  }
  xhttp.open('GET', 'api.php?api=getBoard&bid=' + bid, true);
  xhttp.send();
}


//RENDER
function render(bid, cards) {
  main.innerHTML = '';
  lists.sort((a,b) => +a.ordr - b.ordr);
  listMax = 0;
  for(l of lists) { //iterate lists
    listMax = +l.ordr;
    let newList = document.createElement('div');
    newList.classList.add('list');
    newList.setAttribute('ondrop', "dragDrop(event)");
    newList.innerHTML = `<div class=listTitle id=${l.id} ordr=${l.ordr} style="background:#${l.color};"><div class=listName contenteditable=true autocorrect=off spellcheck=false onblur=renameList(this)>${l.name}</div><button class=moveListBtn onclick=moveList(this.parentElement,'left')>&lt;</button><button class=moveListBtn onclick=moveList(this.parentElement,'right')>&gt;</button><button class=deleteListBtn onclick=deleteList(this.parentElement)>X</button></div><div class=cardContainer id=cc${l.id}></div><div class=addCardBtn ondragenter=dragOverNewCardBtn(event) onclick=newCard('${l.id}')>+ Add Card</div>`;
    main.appendChild(newList);

    let cardsContainer = document.getElementById('cc' + l.id);
    let card = cards.find(e => (e.list === l.id && e.parent == 0)); //find first card
    while(card) {
      let newCard = document.createElement('div'); //card
      newCard.classList.add('card');
      newCard.id = card.id;
      if(card.description)
        newCard.classList.add('hasDescription');
      newCard.setAttribute('onclick', "viewCard('"+card.id+"')");
      newCard.setAttribute('draggable', true); newCard.setAttribute('ondragstart', "dragStart(event)"); newCard.setAttribute('ondragend', "dragEnd(event)"); newCard.setAttribute('ondragenter', "dragEnter(event)");
      let tagsDiv = document.createElement('div'); //tags
      tagsDiv.id = 'tags' + card.id;
      tagsDiv.classList.add('tags');
      let _tags = card.tags?.split(' '); //color tags
      if(_tags &&_tags != 0 && _tags[0] != '') {
        for(t of _tags) {
          let colorTag = document.createElement('div');
          colorTag.style.background = '#'+t;
          colorTag.setAttribute('color', t);
          tagsDiv.appendChild(colorTag);
        }
      }
      newCard.appendChild(tagsDiv);
      newCard.append(card.title);
      cardsContainer.appendChild(newCard);

      card = cards.find(e => e.parent === card.id); //find next card
    }
  }
  main.innerHTML += `<div class=newListContainer id=newListColumn>Add List<br><input type=text maxlength=1023 id=newListName placeholder="New List Name" onkeyup="if(event.key === 'Enter') addList()"><br><button id=newListBtn onclick=addList()>Add List</button></div>`;
  if(currentBoard)
    main.style.backgroundImage = currentBoard.bgimg ? 'url(' + currentBoard.bgimg + ')' : null;
}


//ADD LIST
function addList() {
  var lname = newListName.value.trim();
  if(!lname) return;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      listMax += 1;
      lists.push({id:this.responseText, name:lname, color:null, ordr:listMax});
      let newList = document.createElement('div');
      newList.classList.add('list');
      newList.setAttribute('ondrop', "dragDrop(event)");
      newList.innerHTML = `<div class=listTitle id=${this.responseText} ordr=${listMax}><div class=listName contenteditable=true autocorrect=off spellcheck=false onblur=renameList(this)>${lname}</div><button class=moveListBtn onclick=moveList(this.parentElement,'left')>&lt;</button><button class=moveListBtn onclick=moveList(this.parentElement,'right')>&gt;</button><button class=deleteListBtn onclick=deleteList(this.parentElement)>X</button></div><div class=cardContainer id=cc${this.responseText}></div><div class=addCardBtn ondragenter=dragOverNewCardBtn(event) onclick=newCard('${this.responseText}')>+ Add Card</div>`;
      newListColumn.insertAdjacentElement('beforeBegin', newList);
      newListName.value = null;
    }
  }
  xhttp.open('GET', 'api.php?api=addList&bid=' + boardID + '&name=' + encodeURIComponent(lname) + '&pos=' + (listMax + 1), true);
  xhttp.send();
}


//ADD CARD
function newCard(listID) {
  if(!listID) return;

  var cardsContainer = document.getElementById('cc' + listID);
  var lastCard = cardsContainer.lastElementChild;
  var pid = lastCard ? lastCard.id : '0';
  var _cardTitle = 'New Card';

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      newCard.id = this.responseText;
      newCardTags.id = 'tags' + this.responseText;
      newCard.setAttribute('onclick', "viewCard('"+this.responseText+"')");
    }
    else newCard.remove();
  }
  xhttp.open('GET', 'api.php?api=newCard&bid=' + boardID + '&listid=' + listID + '&pid=' + pid  + '&title=' + encodeURIComponent(_cardTitle), true);
  xhttp.send();

  var newCard = document.createElement('div');
  newCard.classList.add('card');
  newCard.setAttribute('draggable', true); newCard.setAttribute('ondragstart', "dragStart(event)"); newCard.setAttribute('ondragend', "dragEnd(event)"); newCard.setAttribute('ondragenter', "dragEnter(event)");
  var newCardTags = document.createElement('div');
  newCardTags.classList.add('tags');
  newCard.appendChild(newCardTags);
  newCard.appendChild(document.createTextNode(_cardTitle));
  cardsContainer.appendChild(newCard);
  cardsContainer.scrollTop = cardsContainer.scrollHeight;
}


//VIEW CARD DETAILS
function viewCard(cardID) {
  route('viewCard');

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      activeCard = JSON.parse(this.responseText);
      if(activeCard == 0) {route('home'); return;}
      cardTitle.innerText = activeCard.title;
      cardDescription.value = activeCard.description;
      cardDescription.style.height = 0;
      cardDescription.style.height = cardDescription.scrollHeight + 8 + 'px';
      var _tags = activeCard.tags?.split(' ');
      if(!_tags || _tags == 0 || _tags[0] == '') return;
      for(color of _tags) {
        var newTag = document.createElement('div');
        newTag.style.background = '#'+color;
        newTag.setAttribute('onclick', "delTag(this,'"+color+"')");
        addTagBtn.insertAdjacentElement('beforebegin', newTag);
      }
    }
  }
  xhttp.open('GET', 'api.php?api=getCard&bid=' + boardID + '&cardid=' + cardID, true);
  xhttp.send();
}


//CLOSE POPUPS
function closeCard() {
  if(activeCard) //card details
    saveCard();
  route('home');
}


//SAVE CARD DETAILS
function saveCard() {
  if(!activeCard) return;

  var activeCardID = activeCard.id;
  var title = cardTitle.innerText.trim();
  if(!title) {
    cardTitle.innerText = activeCard.title;
    return;
  }
  if(title.length > 1023) {
    alert('Error:\nTitle length: ' + title.length + '\nRequired: 1 - 1023');
    return;
  }

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      var card = document.getElementById(activeCardID);
      card.lastChild.textContent = title;
      if(activeCard) {
        activeCard.title = title;
        activeCard.description = cardDescription.value;
      }
      if(cardDescription.value)
        card.classList.add('hasDescription');
      else
        card.classList.remove('hasDescription');
      viewCardBox.focus();
    }
  }
  if(activeCard.title != title || (activeCard.description || '') != cardDescription.value) { //title or descrption changed
    xhttp.open('POST', 'api.php?api=saveCard&bid=' + boardID + '&cardid=' + activeCard.id + '&title=' + encodeURIComponent(title), true);
    xhttp.send(cardDescription.value);
  }
}


//CANCEL CARD DETAILS
function cancelCard() {
  cardDescription.value = activeCard.description;
  viewCardBox.focus();
}


//DELETE BOARD
function deleteBoard() {
  if(!boardID) return;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      setCookie('bid', 0, true);
      window.location = '?b=';
    }
    else alert('Error: ' + this.status);
  }

  if(confirm('DELETE Entire Board?\n' + currentBoard.name)) {
    xhttp.open('PUT', 'api.php?api=deleteBoard&bid=' + boardID, true);
    xhttp.send();
  }
}


//ADD TAG
function addTag(color) {
  if(!color) return;
  var card = document.getElementById(activeCard.id);
  var preExisting = card.querySelector('div[color="'+color+'"]');
  if(preExisting) return;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      var newTag = document.createElement('div'); //view card details tag
      newTag.style.background = '#'+color;
      newTag.setAttribute('onclick', "delTag(this,'"+color+"')");
      addTagBtn.insertAdjacentElement('beforebegin', newTag);

      newTag = document.createElement('div'); //card color tag
      newTag.style.background = '#'+color;
      newTag.setAttribute('color', color);
      document.getElementById('tags' + activeCard.id).appendChild(newTag);

      addTagBox.style.height = 0;
    }
  }
  xhttp.open('GET', 'api.php?api=addTag&bid=' + boardID + '&cardid=' + activeCard.id + '&color=' + color, true);
  xhttp.send();
}


//DELETE TAG
function delTag(elem, color) {
  if(!color) return;
  var card = document.getElementById(activeCard.id);
  var colorTag = card.querySelector('div[color="'+color+'"]');
  if(!colorTag) return;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      elem.remove();
      colorTag.remove();
      addTagBox.style.height = 0;
    }
    else alert('Error: ' + this.status);
  }
  xhttp.open('PUT', 'api.php?api=delTag&bid=' + boardID + '&cardid=' + activeCard.id + '&color=' + color, true);
  xhttp.send();
}


//RENAME LIST
function renameList(titleElem) {
  if(!titleElem) return;
  var listTitle = titleElem.innerText.trim();
  var listID = titleElem.parentElement.id;
  var _list = lists.find(e => e.id === listID);
  if(!listTitle) {
    titleElem.innerText = _list.name;
    return;
  }
  if(listTitle.length > 1023) {
    alert('Error:\nTitle length: ' + listTitle.length + '\nRequired: 1 - 1023');
    return;
  }

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      _list.name = listTitle;
    }
    else {
      titleElem.innerText = _list.name;
      alert('Error: ' + this.status);
    }
  }
  xhttp.open('GET', 'api.php?api=renameList&bid=' + boardID + '&lid=' + listID + '&title=' + encodeURIComponent(listTitle), true);
  xhttp.send();
}


//MOVE LIST
function moveList(listTitle, direction) {
  if(!listTitle || !direction) return;

  var _listContainer = listTitle.parentElement;
  var swap = (direction === 'right') ? _listContainer.nextElementSibling : _listContainer.previousElementSibling;
  if(!swap || !swap.classList.contains('list') || !_listContainer.classList.contains('list')) return;

  var swapTitle = swap.firstChild;
  var swapOrdr = swapTitle.getAttribute('ordr');
  var listOrdr = listTitle.getAttribute('ordr');

  //move list
  listTitle.setAttribute('ordr', swapOrdr);
  swapTitle.setAttribute('ordr', listOrdr);
  var swapDir = (direction === 'right') ? 'beforebegin' : 'afterend';
  _listContainer.insertAdjacentElement(swapDir, swap);

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status !== 200) { //revert move
      listTitle.setAttribute('ordr', listOrdr);
      swapTitle.setAttribute('ordr', swapOrdr);
      swapDir = (direction !== 'right') ? 'beforebegin' : 'afterend';
      _listContainer.insertAdjacentElement(swapDir, swap);
    }
  }
  xhttp.open('GET', 'api.php?api=moveList&bid=' + boardID + '&lid1=' + listTitle.id + '&lid2=' + swapTitle.id + '&ordr1='  + listOrdr + '&ordr2=' + swapOrdr, true);
  xhttp.send();
}


//DELETE LIST
function deleteList(titleElem) {
  if(!titleElem) return;
  var listID = titleElem.id;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      titleElem.parentElement.remove();
    }
    else alert('Error: ' + this.status);
  }

  if(confirm('Delete List and all cards in it?\n' + titleElem.firstChild.textContent)) {
    xhttp.open('PUT', 'api.php?api=deleteList&bid=' + boardID + '&lid=' + listID, true);
    xhttp.send();
  }
}


//ARCHIVE CARD
function archiveCard() {
  if(!activeCard) return;
  var _card = document.getElementById(activeCard.id);
  if(!_card) return;
  var pid = _card.previousElementSibling ? _card.previousElementSibling.id : '0';

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      _card.remove();
    }
    else virwCard(_card.id);
  }
  xhttp.open('GET', 'api.php?api=archiveCard&bid=' + boardID + '&cardid=' + activeCard.id + '&pid=' + pid, true);
  xhttp.send();
  route('home');
}


//Populate Tag Colors
function populateTagColors() {
  for(color of tagPalette) {
    let colorTag = document.createElement('div');
    colorTag.style.background = '#'+color;
    colorTag.setAttribute('onclick', "addTag('"+color+"')");
    addTagBox.appendChild(colorTag);
  }
}

//Show Tags
function showTags() {
  addTagBox.style.height = (addTagBox.style.height != '18px') ? '18px' : 0;
}


//Export Board
function exportBoard() {
  if(boardID)
    window.location.href = 'api.php?api=export&bid=' + boardID;
}


//Import Board
function importBoard() {
  if(importFile.files.length !== 1) return;
  importFile.disabled = true;
  loader.style.display = 'inline-block';
  var file = importFile.files[0];

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    importFile.disabled = false;
    loader.style.display = 'none';
    importFile.value = null;
    if(this.status === 200) {
      route('home');
      window.location = '?b=' + this.responseText;
    }
    else alert('Import Failed');
  }
  xhttp.open('POST', 'api.php?api=import', true);
  xhttp.send(importFile.files[0]);
}


//DRAG DROP
var offsetX, offsetY, draggedCard, dragster, spacer = document.createElement('div');
spacer.classList.add('spacer');

function dragStart(e) {
  draggedCard = e.target;
  dragster = e.target.cloneNode(true);
  dragster.classList.add('dragster');
  document.body.appendChild(dragster);
  dragster.style.width = e.target.getBoundingClientRect().width  + 'px';
  spacer.style.height = e.target.getBoundingClientRect().height  + 'px';
  offsetX = e.pageX - e.target.getBoundingClientRect().x;
  offsetY = e.pageY - e.target.getBoundingClientRect().y;
  dragster.style.top = (e.pageY - offsetY) + 'px';
  dragster.style.left = (e.pageX - offsetX) + 'px';
  draggedCard.style.display = 'none';
}
function dragEnd(e) {
  spacer.remove();
  if(dragster) {
    dragster.remove();
    dragster = null;
  }
  draggedCard.style.display = null;
}
function dragEnter(e) {
  e.preventDefault();
  e.target.insertAdjacentElement('beforebegin', spacer);
}
function dragOverNewCardBtn(e) {
  e.preventDefault();
  e.target.previousElementSibling.insertAdjacentElement('beforeend', spacer);
}
function dragOver(e) {
  e.preventDefault();
  dragster.style.top = (e.pageY - offsetY) + 'px';
  dragster.style.left = (e.pageX - offsetX) + 'px';
}


//MOVE CARD
function dragDrop(e) {
  e.preventDefault(); e.stopPropagation();
  var lastInList = !spacer.nextElementSibling;
  var dropTarget = lastInList ? spacer.previousElementSibling : spacer.nextElementSibling;
  var dlid = spacer.parentElement.id.substr(2);
  var stid = draggedCard.id;
  var dtid = dropTarget ? dropTarget.id : '0';
  var slist = draggedCard.parentElement;
  var voidTile = draggedCard.nextElementSibling;
  var vtid = voidTile ? voidTile.id : '0';
  dragEnd(e);
  if(draggedCard === dropTarget)
    return;
  var spid = draggedCard.previousElementSibling ? draggedCard.previousElementSibling.id : '0';
  var dpid = (dropTarget && dropTarget.previousElementSibling) ? dropTarget.previousElementSibling.id : '0';
  if(!lastInList && dpid == stid) return;
  if(lastInList) {
    dpid = dtid;
    dtid = '0';
  }
  //move card
  if(lastInList) { //moved to last in list
    if(dropTarget) //at least 1 card in list
      dropTarget.insertAdjacentElement('afterend', draggedCard);
    else //dest list is empty
      document.getElementById('cc' + dlid).appendChild(draggedCard);
  }
  else //move to anywhere but last/only
    dropTarget.insertAdjacentElement('beforebegin', draggedCard);

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status !== 200) { //revert move
      if(voidTile) voidTile.insertAdjacentElement('beforebegin', draggedCard);
      else if(spid !== '0') document.getElementById(spid).insertAdjacentElement('afterend', draggedCard);
      else slist.appendChild(draggedCard);
    }
  }
  xhttp.open('GET', 'api.php?api=moveCard&bid=' + boardID + '&stid=' + stid + '&dtid=' + dtid + '&spid=' + spid + '&dpid=' + dpid + '&dlid=' + dlid + '&vtid=' + vtid, true);
  xhttp.send();
}

