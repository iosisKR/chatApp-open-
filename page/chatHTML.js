
//Document_Values>>
const displayContainer = document.querySelector('.display-container');
const newChatAl = document.getElementById('newChatAl');




//<<Values>>
let isBotton = true; //채팅창스크롤이 맨 아래 있는지
let backMsgs = 0;
setInterval(()=> Update(), 100);
//  

//
var value = '';
try {
    value = document.cookie.match('(^|;) ?Myname=([^;]*)(;|$)')[2];
} catch (error) {
    value = 'ghost'
}
console.log(window.location.search);
//<<Name>>
let Myname = prompt('이름 입력(20글자 이내 / 실제 이름X', value);
Myname = Myname.split(' ').join('');
while (Myname.length > 20) {
    alert('20글자 이내로 해주세요.');
    Myname = prompt('이름 입력(20글자 이내 / 실제 이름X', Myname);
    Myname = Myname.split(' ').join('');
}
if (Myname == 'null' || Myname == '')
    Myname = 'ghost';

document.cookie = `Myname=${Myname};max-age=2592000`;

var socket = io();

//<<socket>>
socket.emit('connectTrial', window.location.search);

socket.emit('connectMessage', Myname);
socket.on('Rename', (msg) => {
    Myname = msg;
});
let mean143; //CM value
socket.on('이전내용보내기', (msg) => {
    if(Myname == 'CM')
        mean143 = msg;
    for (var a = 0; a < msg.length; a++) {
        displayContainer.innerHTML += getHTMLstyle(msg[a][0], msg[a][1], msg[a][2], msg[a][3], msg[a][4]);
    }
    displayContainer.scrollTop = displayContainer.scrollHeight - 300;
});

socket.on('message', (name, id, msg, type, time) => {

    var scrollTop = displayContainer.scrollTop;
    var scrollHeight = displayContainer.scrollHeight;
    var clientHeight = displayContainer.clientHeight;

    isBotton = (scrollHeight - scrollTop === clientHeight);


    displayContainer.innerHTML += getHTMLstyle(name, id, msg, type, time);

    if (isBotton) {
        backMsgs = 0;
        displayContainer.scrollTop = displayContainer.scrollHeight - 300;
    } else {
        backMsgs++;
    }
});
socket.on('users.count', function (number) {
    document.getElementById('users-count').innerHTML = `현재인원 : ${number}명 `;
});
socket.on('return', function (names) {
    console.log(names);
    displayContainer.innerHTML += '접속자 목록: ' + names + '</br>';
    displayContainer.scrollTop = displayContainer.scrollHeight - 300;
});
socket.on('resetmessage', function () {
    displayContainer.innerHTML = '';
});
socket.on('GETOUT', function (msg) {
    let url = msg ? 'https://namu.wiki/w/%EA%B0%95%EC%A0%9C%ED%87%B4%EC%9E%A5' : 'https://namu.wiki/w/%EA%B0%95%EC%A0%9C%ED%87%B4%EC%9E%A5';
    location.replace(url);
});

//<<function>>
function SEND(msg, e) { //몇초걸린지 확인하게 해주삼.
    if (e.keyCode == 13 || e == true || e =='image') {
        if (msg == '')
            return;

            
        document.getElementById('msg').value = '';
        socket.emit('SEND', msg, e=='image' ? 'image': 'chat');
        
        var date = new Date();
        let time = date.getHours() + ":"+ date.getMinutes();

        displayContainer.innerHTML += `
        <div id="Me" style ="text-align:right;">
            <time>${time}</time>
            <span id ="Mychat">${msg}</span>
        </div>
        `;
        isBotton = true;
        displayContainer.scrollTop = displayContainer.scrollHeight - 300;



    }
}
function DEL() {
    displayContainer.innerText = '';
}
function REname() {
    const named = Myname;
    Myname = prompt('이름 입력(20글자 이내 / 실제 이름X)', named);
    Myname = Myname.split(' ').join('');
    if (Myname.length > 20) {
        alert('20글자 이내로 해주세요.');
        REname();
        return;
    }
    if (Myname == 'null' || Myname == '' || Myname == named) {
        Myname = named;
        return;
    }
    
    document.cookie = `Myname=${Myname};max-age=2592000`;yContainer
    socket.emit('ReName', Myname);
}
function CheckList() {
    socket.emit('CheckList');
}

function Update() {
    var scrollTop = displayContainer.scrollTop;
    var scrollHeight = displayContainer.scrollHeight;
    var clientHeight = displayContainer.clientHeight;

    isBotton = (scrollHeight - scrollTop === clientHeight);

    if (backMsgs > 0) {
        newChatAl.innerHTML = 'new (' + backMsgs + ')';
    } else {
        if (newChatAl.innerHTML != '') {
            newChatAl.innerHTML = '';
            backMsgs = 0;
        }
    }
    if (isBotton) {
        if (newChatAl.innerHTML != '') {
            newChatAl.innerHTML = '';
            backMsgs = 0;
        }
    }
}

function getHTMLstyle(name, id, msg, type, time) {
    switch (type) {
        case ('chat'):
            return `
            <span id="Other">
                <name>${name}</name>
                <sid>[${id}]</sid>
                </br>
                <span id = "Otherchat">${msg}</span><time>${time}</time>
            </span></br>
            `;

        case ('notice'):
            return `
            <div id ="Notice">${msg}</div>
            `;

        case ('information'):
            return `
            <div id="Information">${msg}</div>            
            `;

        case ('wrong'):
            return `
                    <div style="font-size: 15px; font-weight: bold; text-align: center; font-style: italic  ;color: red;">${msg}</div>
                    `;
        case ('Rename'):
            return `
                    <div style="font-size: 15px; font-weight: bold; text-align: center; font-style: italic  ;">${msg}</div>
                    `;

        case ('whisper'):
            return `    
            <span id="Other">
                <name style="color:rgb(95, 95, 95);">${name}</name>
                <sid style="color:rgb(95, 95, 95);">[${id}] (귓속말)</sid>
                </br>
                <span id = "Otherchat">${msg}</span>
                <time>${time}</time>
            </span></br>
            `;

        case('image'):
            var img = URL.createObjectURL(msg);
            console.log(msg);   
            return`
            <img src="${img}" style ="max-width: 50%; height:auto;" alt="${msg}">
            
            `;


        default:
            console.log("3번");
            break;
    }
}