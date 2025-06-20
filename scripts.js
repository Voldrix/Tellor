var boardsJSON, currentBoard, tags, lists, activeCard, listMax, defaultTextColor = '#f0f0f0';
var tagPalette = ['#900', '#F80', '#DD0', '#090', '#0DD', '#00B', '#80F', '#F08', '#E0E', '#F8F', '#000', '#FFF', '#888'];

const getCookie = (cookie) => (document.cookie.match('(^|;)\\s*'+cookie+'\\s*=\\s*([^;]+)')?.pop()||'');
function setCookie(cookie, value, del=false) {
  var date = new Date();
  if(del) date.setTime(1);
  else date.setTime(date.getTime() + (120*24*60*60*1000)); //120 days
  document.cookie = cookie + '=' + value + '; expires=' + date.toUTCString() + '; SameSite=Lax';
}


//BOARD HOT LINK
var urlParams = new URLSearchParams(window.location.search);
var boardID = urlParams.get('b') || getCookie('bid') || null;
var menuState = getCookie('menuState') || 'open';


getBoards();
if(boardID)
  changeBoard(boardID, true);
if(menuState === 'closed' && window.innerWidth > 1000)
  toggleMenu('close');
if(getCookie('orientation'))
  scrollOrientation();
populateTagColors();


//POP STATE
window.onkeyup = (e) => {if(e.key === 'Escape') {closeCard();}};
window.onpopstate = function(event) {
  if(event.state && !activeCard) {
    route('home');
    if(event.state !== boardID)
      changeBoard(event.state, true);
  }
  else
    closeCard();
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

  if(_route === 'home')
    return;
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
    viewCardBox.style.display = 'flex';
    tagsBox.innerHTML = '<button id=addTagBtn onclick=showTags()>+</button>';
    cardDescTA.style.display = 'none';
    cardDescDiv.style.display = 'block';
    addTagBox.style.height = 0;
  }
  if(history.state)
    history.pushState(null, '', '');
}


//GET BOARDS
function getBoards() {
  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      boardsJSON = JSON.parse(this.responseText);
      for(b of boardsJSON) {
        let option = document.createElement("option"); //select menu option
        option.text = b.name;
        option.value = b.id;
        boardsSelect.appendChild(option);
        let menuBtn = document.createElement("a"); //side menu button
        menuBtn.href = "?b=" + b.id;
        menuBtn.setAttribute('onclick', "event.preventDefault();changeBoard('"+b.id+"',false)");
        menuBtn.textContent = b.name;
        boards.appendChild(menuBtn);
      }
      if(boardID) { //default board set, changeBoard will/has run
        currentBoard = boardsJSON.find(e => e.id === boardID);
        if(currentBoard && lists !== undefined) { //board exists and changeBoard resolved first (race cond)
          setActiveBoardBtn();
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
  if(!bname) return;

  var imgurl = newbgimgurl.value.trim();
  if(imgurl && !URL.canParse(imgurl)) {alert('Invalid URL'); return;}

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      let option = document.createElement("option"); //select menu option
      option.text = bname;
      option.value = this.responseText;
      boardsSelect.appendChild(option);
      let menuBtn = document.createElement("a"); //side menu button
      menuBtn.href = "?b=" + this.responseText;
      menuBtn.setAttribute('onclick', "event.preventDefault();changeBoard('"+this.responseText+"',false)");
      menuBtn.textContent = bname;
      boards.appendChild(menuBtn);
      boardsJSON.push({id:this.responseText, name:bname, bgimg:imgurl});
      route('home');
      changeBoard(this.responseText, false);
    }
    else alert('Error: ' + this.status);
  }
  xhttp.open('GET', 'api.php?api=newBoard&name=' + encodeURIComponent(bname) + '&imgurl=' + encodeURIComponent(imgurl), true);
  xhttp.send();
}


//EDIT BOARD
function editBoard() {
  var bname = boardName.value;
  if(!bname) return;

  var imgurl = bgimgurl.value;
  if(imgurl && !URL.canParse(imgurl)) {alert('Invalid URL'); return;}

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      currentBoard.name = bname;
      currentBoard.bgimg = imgurl;
      route('home');
      var btn = boards.querySelector('a[href="?b='+boardID+'"'); //side menu button
      if(btn) btn.textContent = bname;
      btn = boardsSelect.querySelector('option[value="'+boardID+'"'); //select menu option
      if(btn) btn.textContent = bname;
      document.title = bname + ' | Tellor';
      main.style.backgroundImage = imgurl ? 'url(' + imgurl + ')' : null;
    }
    else alert('Error: ' + this.status);
  }
  xhttp.open('GET', 'api.php?api=editBoard&bid=' + boardID + '&name=' + encodeURIComponent(bname) + '&imgurl=' + encodeURIComponent(imgurl), true);
  xhttp.send();
}


//CHANGE BOARD
function changeBoard(bid, popState) {
  if(!bid) return;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      var board = JSON.parse(this.responseText);
      boardID = bid;
      if(boardsJSON) //skip only if getBoards has not loaded yet (race cond)
        currentBoard = boardsJSON.find(e => e.id === bid);
      lists = board.lists;
      render(board.cards);
      setCookie('bid', bid, false);
      if(!history.state) //init load. set history.state
        history.replaceState(bid, '', '?b=' + bid);
      if(!popState) //nav via menu, not history
        history.pushState(bid, '', '?b=' + bid);
      if(window.innerWidth < 1000) //close menu on mobile
        toggleMenu('open'); //mobile menu state is reversed. so to be closed by default
      delete board.cards;
    }
    else {
      boardID = currentBoard = main.style.backgroundImage = null;
      main.innerHTML = 'Error getting board: ' + this.status;
    }
    if(boardsJSON) { //skip only if getBoards has not loaded yet (race cond)
      setActiveBoardBtn();
      document.title = currentBoard ? currentBoard.name + ' | Tellor' : 'Tellor';
    }
  }
  xhttp.open('GET', 'api.php?api=getBoard&bid=' + bid, true);
  xhttp.send();
}


//Set Active Board Btn
function setActiveBoardBtn() {
  boardsSelect.value = boardID || '';
  var menuBtns = boards.querySelectorAll('a');
  for(e of menuBtns) {
    if(e.search === '?b=' + boardID)
      e.classList.add('activeBoard');
    else
      e.classList.remove('activeBoard');
  }
}


//Find Card
function findCard(cards, pid, start, end) {
  for(let i = start; i < end; i++) {
    if(cards[i].parent === pid)
      return cards[i];
  }
  return false;
}


//RENDER
function render(cards) {
  main.innerHTML = '';
  lists.sort((a,b) => +a.ordr - b.ordr);
  listMax = 0;
  if(currentBoard)
    main.style.backgroundImage = currentBoard.bgimg ? 'url(' + currentBoard.bgimg + ')' : null;

  //find list boundaries in cards list. this scales better than .find
  var currentList, clID, clStart = 0;
  for(let i = 0; i < cards.length; i++) {
    if(cards[i].list !== clID) {
      clStart = i;
      clID = cards[i].list;
      if(currentList)
        currentList.end = i;
      currentList = lists.find(e => e.id === clID);
      currentList.start = clStart;
    }
  }
  if(currentList)
    currentList.end = cards.length;

  for(l of lists) { //iterate lists
    listMax = +l.ordr;
    let newList = document.createElement('div');
    newList.classList.add('list');
    newList.setAttribute('ondrop', "dragDrop(event)");
    newList.setAttribute('ondragleave', "dragLeaveList(event)");
    newList.innerHTML = `<div class=listTitle id=${l.id} ordr=${l.ordr}><pre class=listName contenteditable=true autocorrect=off spellcheck=false onblur=renameList(this)>${l.name}</pre><button class=moveListBtn onclick=moveList(this.parentElement,'left')>&lt;</button><button class=moveListBtn onclick=moveList(this.parentElement,'right')>&gt;</button><button class=deleteListBtn onclick=deleteList(this.parentElement)>X</button></div><div class=cardContainer id=cc${l.id}></div><div class=addCardBtn ondragenter=dragOverNewCardBtn(event) onclick=newCard('${l.id}')>+ Add Card</div>`;
    main.appendChild(newList);

    let cardsContainer = document.getElementById('cc' + l.id);
    let card = findCard(cards, '0', l.start, l.end); //find first card
    while(card) {
      let newCard = document.createElement('div'); //card
      newCard.classList.add('card');
      newCard.id = card.id;
      if(card.description)
        newCard.classList.add('hasDescription');
      if(card.color)
        newCard.style.color = card.color;
      newCard.setAttribute('onclick', "viewCard('"+card.id+"')");
      newCard.setAttribute('draggable', true); newCard.setAttribute('ondragstart', "dragStart(event)"); newCard.setAttribute('ondragend', "dragEnd(event)"); newCard.setAttribute('ondragenter', "dragEnter(event)");
      let tagsDiv = document.createElement('div'); //tags
      tagsDiv.id = 'tags' + card.id;
      tagsDiv.classList.add('tags');
      let _tags = card.tags?.split(' '); //color tags
      if(_tags && _tags != 0 && _tags[0] != '') {
        for(tagColor of _tags) {
          let colorTag = document.createElement('div');
          colorTag.style.background = tagColor;
          colorTag.setAttribute('color', tagColor);
          tagsDiv.appendChild(colorTag);
        }
      }
      newCard.appendChild(tagsDiv);
      newCard.append(card.title);
      cardsContainer.appendChild(newCard);

      card = findCard(cards, card.id, l.start, l.end); //find next card
    }
  }

  main.innerHTML += `<div class=newListContainer id=newListColumn>Add List<br><input type=text maxlength=1023 id=newListName placeholder="New List Name" onkeyup="if(event.key === 'Enter') addList()"><br><button id=newListBtn onclick=addList()>Add List</button></div>`;
}


//ADD LIST
function addList() {
  var lname = newListName.value.trim();
  if(!lname) return;
  lname = lname.replaceAll('<', '&lt;');

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      listMax += 1;
      lists.push({id:this.responseText, name:lname, color:null, ordr:listMax});
      let newList = document.createElement('div');
      newList.classList.add('list');
      newList.setAttribute('ondrop', "dragDrop(event)");
      newList.setAttribute('ondragleave', "dragLeaveList(event)");
      newList.innerHTML = `<div class=listTitle id=${this.responseText} ordr=${listMax}><pre class=listName contenteditable=true autocorrect=off spellcheck=false onblur=renameList(this)>${lname}</pre><button class=moveListBtn onclick=moveList(this.parentElement,'left')>&lt;</button><button class=moveListBtn onclick=moveList(this.parentElement,'right')>&gt;</button><button class=deleteListBtn onclick=deleteList(this.parentElement)>X</button></div><div class=cardContainer id=cc${this.responseText}></div><div class=addCardBtn ondragenter=dragOverNewCardBtn(event) onclick=newCard('${this.responseText}')>+ Add Card</div>`;
      newListColumn.insertAdjacentElement('beforeBegin', newList);
      newListName.value = null;
      main.scrollLeft = main.scrollWidth;
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

  var newCard = document.createElement('div');
  newCard.id = 'new'; //tmp id
  newCard.classList.add('card');
  newCard.setAttribute('draggable', true); newCard.setAttribute('ondragstart', "dragStart(event)"); newCard.setAttribute('ondragend', "dragEnd(event)"); newCard.setAttribute('ondragenter', "dragEnter(event)");
  var newCardTags = document.createElement('div');
  newCardTags.id = 'tagsnew'; //tmp id
  newCardTags.classList.add('tags');
  newCard.appendChild(newCardTags);
  newCard.appendChild(document.createTextNode(_cardTitle));
  cardsContainer.appendChild(newCard);
  cardsContainer.scrollTop = cardsContainer.scrollHeight;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      newCard.id = activeCard.id = this.responseText; //real id
      newCardTags.id = 'tags' + this.responseText; //real id
      newCard.setAttribute('onclick', "viewCard('"+this.responseText+"')");
    }
    else newCard.remove();
  }

  xhttp.open('GET', 'api.php?api=newCard&bid=' + boardID + '&listid=' + listID + '&pid=' + pid  + '&title=' + encodeURIComponent(_cardTitle), true);
  xhttp.send();
  viewCard('new');
  window.getSelection().selectAllChildren(cardTitle);
}


//CLOSE POPUPS
function closeCard() {
  if(activeCard) { //save before route to preserve card details
    if(activeCard.id === 'new') { //retry save until new card id has resolved
      setTimeout(closeCard, 100);
      return;
    }
    saveCard();
  }
  route('home');
}


//VIEW CARD DETAILS
function viewCard(cardID) {
  route('viewCard');

  var card = document.getElementById(cardID);
  cardTitle.textContent = card.textContent; //get title from card tile
  cardDescTA.value = cardDescDiv.innerHTML = cdate.textContent = mdate.textContent = ''; //clear description
  var listID = card.parentElement.id.substring(2);
  var color = card.style.color ? rgb2hex(card.style.color) : defaultTextColor; //card text color
  cardTextColorPicker.value = color;
  var cardTags = document.getElementById('tags' + cardID); //get tags from card tile
  var _tags = [...cardTags.children].map(e => e.attributes.color.value);
  if(_tags && _tags != 0) {
    for(tagColor of _tags) {
      var newTag = document.createElement('div');
      newTag.style.background = tagColor;
      newTag.setAttribute('onclick', "delTag(this,'"+tagColor+"')");
      addTagBtn.insertAdjacentElement('beforebegin', newTag);
    }
  }

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      const descJSON = JSON.parse(this.responseText);
      cdate.textContent = descJSON.cdate;
      mdate.textContent = descJSON.mdate;
      activeCard.description = cardDescTA.value = descJSON.description;
      parseDescription();
    }
  }

  if(cardID !== 'new') {
    xhttp.open('GET', 'api.php?api=getCard&bid=' + boardID + '&listid=' + listID + '&cardid=' + cardID, true);
    xhttp.send();
  }
  activeCard = {id: cardID, title: card.textContent, color: color, list: listID, description: ''};
}


//SAVE CARD DETAILS
function saveCard() {
  if(!activeCard) return;
  var card = document.getElementById(activeCard.id);
  var title = cardTitle.innerText.trim();
  if(!title) { //revert empty title
    cardTitle.textContent = activeCard.title;
    return;
  }

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      card.lastChild.textContent = title;
      if(activeCard) {
        activeCard.title = title;
        activeCard.description = cardDescTA.value;
        mdate.textContent = new Date().toLocaleDateString("en-gb", {day: 'numeric', month: 'short', year: 'numeric'});
      }
    }
  }
  if(activeCard.title != title || (activeCard.description || '') != cardDescTA.value) { //title or descrption changed
    if(activeCard.id === 'new') { //retry save until new card id has resolved. skip if no change made
      setTimeout(saveCard, 100);
      return;
    }
    xhttp.open('POST', 'api.php?api=saveCard&bid=' + boardID + '&listid=' + activeCard.list + '&cardid=' + activeCard.id + '&title=' + encodeURIComponent(title), true);
    xhttp.send(cardDescTA.value);

    if(cardDescTA.value) card.classList.add('hasDescription');
    else card.classList.remove('hasDescription');
  }
}


//EDIT DESCRIPTION
function editDescription(event) { //onClick
  if(event.target.nodeName == 'A') //enable link click w/o starting edit
    return;
  if(window.getSelection().anchorOffset - window.getSelection().focusOffset) //allow highlight description w/o starting edit
    return;
  cardDescDiv.style.display = 'none';
  cardDescTA.style.display = 'block';
  cardDescTA.style.height = 0;
  cardDescTA.style.height = cardDescTA.scrollHeight + 2 + 'px'; //+2 eliminates scrollbar
  cardDescTA.focus();
}

//EDIT DESCRIPTION FINISHED
function doneEditDescription() { //onBlur
  cardDescDiv.style.display = 'block';
  cardDescTA.style.display = 'none';
  if(!activeCard) return; //saved and closed already
  parseDescription();
}

//CANCEL DESCRIPTION
function cancelCard() {
  cardDescTA.value = activeCard.description;
  parseDescription();
}

//PARSE DESCRIPTION
function parseDescription() {
  var parsedDesc = cardDescTA.value.replaceAll('<', '&lt;'); //html -> text
  parsedDesc = parsedDesc.replace(/\[([^\]]+)\]\((http[^)]+)\)/g, '<a href="$2" target=_blank>$1</a>'); //md links -> html
  parsedDesc = parsedDesc.replace(/(?<!=")(https?:\/\/[^\s)]+)/g, '<a href="$1" target=_blank>$1</a>'); //links -> html
  cardDescDiv.innerHTML = parsedDesc;
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
      newTag.style.background = color;
      newTag.setAttribute('onclick', "delTag(this,'"+color+"')");
      addTagBtn.insertAdjacentElement('beforebegin', newTag);

      newTag = document.createElement('div'); //card tag
      newTag.style.background = color;
      newTag.setAttribute('color', color);
      document.getElementById('tags' + activeCard.id).appendChild(newTag);

      addTagBox.style.height = 0;
    }
  }
  xhttp.open('GET', 'api.php?api=addTag&bid=' + boardID + '&listid=' + activeCard.list + '&cardid=' + activeCard.id + '&color=' + encodeURIComponent(color), true);
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
  xhttp.open('GET', 'api.php?api=delTag&bid=' + boardID + '&listid=' + activeCard.list + '&cardid=' + activeCard.id + '&color=' + encodeURIComponent(color), true);
  xhttp.send();
}


//RENAME LIST
function renameList(titleElem) {
  if(!titleElem) return;
  var listTitle = titleElem.innerText.trim();
  listTitle = listTitle.replaceAll('<', '&lt;');
  var listID = titleElem.parentElement.id;
  var list = lists.find(e => e.id === listID);
  if(!listTitle) {
    titleElem.innerText = list.name;
    return;
  }
  if(listTitle.length > 1023) {
    alert('Error:\nTitle length: ' + listTitle.length + '\nRequired: 1 - 1023');
    return;
  }

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      list.name = listTitle;
    }
    else {
      titleElem.innerText = list.name;
      alert('Error: ' + this.status);
    }
  }
  if(listTitle !== list.name) { //only save if name changed
    xhttp.open('GET', 'api.php?api=renameList&bid=' + boardID + '&listid=' + listID + '&title=' + encodeURIComponent(listTitle), true);
    xhttp.send();
  }
}


//MOVE LIST
function moveList(listTitle, direction) {
  if(!listTitle || !direction) return;

  var listContainer = listTitle.parentElement;
  var swap = (direction === 'right') ? listContainer.nextElementSibling : listContainer.previousElementSibling;
  if(!swap || !swap.classList.contains('list') || !listContainer.classList.contains('list')) return;

  var swapTitle = swap.firstChild;
  var swapOrdr = swapTitle.getAttribute('ordr');
  var listOrdr = listTitle.getAttribute('ordr');

  //move list
  listTitle.setAttribute('ordr', swapOrdr);
  swapTitle.setAttribute('ordr', listOrdr);
  var swapDir = (direction === 'right') ? 'beforebegin' : 'afterend';
  listContainer.insertAdjacentElement(swapDir, swap);

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status !== 200) { //revert move
      listTitle.setAttribute('ordr', listOrdr);
      swapTitle.setAttribute('ordr', swapOrdr);
      swapDir = (direction !== 'right') ? 'beforebegin' : 'afterend';
      listContainer.insertAdjacentElement(swapDir, swap);
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
    xhttp.open('PUT', 'api.php?api=deleteList&bid=' + boardID + '&listid=' + listID, true);
    xhttp.send();
  }
}


//CARD COLOR
function cardColor(color=false) {
  color = color ? defaultTextColor : cardTextColorPicker.value;
  if(color === activeCard.color)
    return;
  var card = document.getElementById(activeCard.id);
  card.style.color = cardTextColorPicker.value = color;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200)
      activeCard.color = color;
    else
      card.style.color = cardTextColorPicker.value = activeCard.color;
  }
  xhttp.open('GET', 'api.php?api=cardColor&bid=' + boardID + '&listid=' + activeCard.list + '&cardid=' + activeCard.id + '&color=' + encodeURIComponent(color), true);
  xhttp.send();
}


//ARCHIVE CARD
function archiveCard() {
  if(!activeCard || activeCard.id === 'new') return;
  var card = document.getElementById(activeCard.id);
  if(!card) return;
  var pid = card.previousElementSibling ? card.previousElementSibling.id : '0';

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      card.remove();
    }
    else {
      card.style.display = null;
      viewCard(card.id);
    }
  }
  xhttp.open('GET', 'api.php?api=archiveCard&bid=' + boardID + '&listid=' + activeCard.list + '&cardid=' + activeCard.id + '&pid=' + pid, true);
  xhttp.send();

  card.style.display = 'none';
  route('home');
}


const rgb2hex = (rgb) => '#' + rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map((n) => parseFloat(n).toString(16).padStart(2,'0')).join('');


//Populate Tag Colors
function populateTagColors() {
  for(color of tagPalette) {
    let colorTag = document.createElement('div');
    colorTag.style.background = color;
    colorTag.setAttribute('onclick', "addTag('"+color+"')");
    addTagBox.appendChild(colorTag);
  }
}


//Show Tags
function showTags() {
  addTagBox.style.height = (addTagBox.style.height != '13px') ? '13px' : 0;
}


//Toggle Menu
function toggleMenu(forced=false) {
  if(forced === 'close') document.body.classList.add('menu-closed');
  else if(forced === 'open') document.body.classList.remove('menu-closed');
  else document.body.classList.toggle('menu-closed');
  if(document.body.classList.contains('menu-closed') && window.innerWidth > 1000) //don't set cookie on mobile. Disallows mobile menu being open by default
    setCookie('menuState', 'closed', false);
  else
    setCookie('menuState', '', true);
}


//Scroll Orientation
function scrollOrientation() {
  main.classList.toggle('vertical');
  var vertical = main.classList.contains('vertical');
  orientationSvg.style.transform = vertical ? 'rotate(90deg)' : 'none';
  setCookie('orientation', 'vertical', !vertical);
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
spacer.style.margin = '6px 0';

function dragStart(e) {
  draggedCard = e.target;
  dragster = draggedCard.cloneNode(true);
  dragster.classList.add('dragster');
  document.body.appendChild(dragster);
  dragster.style.width = e.target.getBoundingClientRect().width  + 'px';
  spacer.style.height = e.target.getBoundingClientRect().height  + 'px';
  offsetX = e.pageX - e.target.getBoundingClientRect().x;
  offsetY = e.pageY - e.target.getBoundingClientRect().y;
  dragster.style.top = (e.pageY - offsetY - 6) + 'px';
  dragster.style.left = (e.pageX - offsetX) + 'px';
  draggedCard.insertAdjacentElement('beforebegin', spacer);
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
  dragster.style.top = (e.pageY - offsetY - 6) + 'px';
  dragster.style.left = (e.pageX - offsetX) + 'px';
}
function dragLeaveList(e) {
  if(e.relatedTarget.id === 'main')
    spacer.remove();
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

