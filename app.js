const express = require('express');
const requestIp = require('request-ip');
const app = express();
const socket = require('socket.io');
const request = require('request');
const multer = require("multer");
const fs = require('fs');
const session = require('express-session');

const port = 3000;
const domain = 'domain';
let password = createPassworld(Math.floor((Math.random() * 40) + 20));

//<<<Express>>>

const server = app.listen(port, () => {
    console.clear();
    console.log(`Server on (URL: ${domain}:${port})`);
    console.log(password);
});

const io = new socket.Server(server);

app.get('/', (req, res) => {
    console.log(GetIP(req, true) + '(main)');
    res.sendFile(__dirname + '/page/index.html');
});

app.get('/rooms', (req, res) => {
    console.log(GetIP(req, true) + '(rooms)');
    res.sendFile(__dirname + '/page/rooms.html');
});
app.get('/chat', (req, res) => {
    console.log(GetIP(req, true) + '(chat)');
    res.sendFile(__dirname + '/page/chat.html');
});

app.get(`/%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8`, (req, res) =>{
    console.log(password);
    res.send('ok.');
});
app.get('/ram', (req, res) =>{
    const used1 = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`약 ${Math.round(used1 * 100) / 100} MB의 메모리를 사용중입니다.`);
    res.send('ok. '  + Math.round(used1 * 100) / 100);
});

app.get('/ip', (req, res) => {
    res.send('IP : ' + GetIP(req, true));
});
app.use(express.static('page'));

//아래 코드들 중에서 더 좋은 방법으로 해결할 수 있는 것은 다음 업데이트에 적용을 시키겠습니다.
//<<<Socket.io>>>
let accessor = 0; //현재 동시접속자수입니다.
let names = []; //[socket.id : name, roomName]
let chattingsValue = []; //채팅기록. [name, id, msg, type, date, roomName]
let rooms = []; //[roomName : 비번 [접속자들]] 현재 미사용

io.on('connection', function (socket) {
    accessor++;
    io.emit('users.count', accessor); //접속수 동기화

    socket.on('connectTrial', function (msg){
        if(msg==''){
            socket.join("mainroom");
        }else{
            if(msg != '?anteroom')
                socket.join(msg.slice(1));
        }
    });


    socket.on('connectMessage', function (msg) {
        let date = new Date();
        let time = date.getHours() + ":" + date.getMinutes();
        names[socket.id] = [msg, Array.from(socket.rooms)[1]];
        RoomJoin();

        if (chattingsValue.length > 200) {
            socket.emit('이전내용보내기', chattingsValue.splice(chattingsValue.length - 200, chattingsValue.length).filter(chat => chat[5] == names[socket.id][1]));
        } else {
            socket.emit('이전내용보내기', chattingsValue.filter(chat => chat[5] == names[socket.id][1]));
        }


        console.log(`[${socket.id}]${msg} 접속`);
        chattingsValue.push([msg, getID(socket.id, 4), msg + '님이 접속하셨습니다.', 'information', time, names[socket.id][1]]);
        saveLog(`[${socket.id}]${msg} 접속`);
        io.to(names[socket.id][1]).emit('message', msg, getID(socket.id, 4), msg + '님이 접속하셨습니다.', 'information', time);

        
     });

     socket.on('roomList', function (msg) {
        try{
        socket.emit('roomList', Array.from(roomList));}
        catch (e){
            
        }
     });


    socket.on('SEND', function (msg, type) {
        
        if(Array.from(socket.rooms)[1]=='anteroom')
            return;

        try{
            var recName = names[socket.id][0]; //rec(전송자)이름
        } catch (e){
            socket.emit('message', '알수없는사용자', '튕김증상', `<wrongman style = "color: red">${error('-9999')}</wrongman>`, 'wrong', '99:99');
            return;
        }

        let date = new Date();
        let time = date.getHours() + ":"+ date.getMinutes();


        //<이미지>
        if(type=='image'){
            message(recName, msg, 'image');hj 
            return;
        }

        console.log(`[${socket.id}]${recName}: ${msg}`);
        saveLog(`[${socket.id}]${recName}: ${msg}`);

        //<명령어>
        if (msg.charAt(0) == '/') {
            let stringToArray = msg.split(" "); //띄어쓰기기준으로 나누기.
            let Rmsg = "";


            if (stringToArray[0] == '/notice') { //공지
                //양식 : /notice (password) (내용)
                if (stringToArray[1] == password) {

                    if (stringToArray.length < 3) {
                        Rmsg = stringToArray[2];
                    } else {
                        for (var a = 2; a < stringToArray.length; a++) {
                            Rmsg += stringToArray[a] + " ";
                        }
                    }
                    message(recName, Rmsg, 'notice', `[${socket.id}]${recName}: ${msg}`);
                }
                return;
            }


            if (stringToArray[0] == '/귓속말') { //귓속말
                //양식 : /귓속말 (이름) (id) (내용)
                if(stringToArray.length <4){
                    socket.emit('message', recName, getID(socket.id, 4), '잘못된 귓속말 양식입니다. (/귓속말 [이름] [ID] [내용])', 'wrong', time);
                    return;
                }

                if (stringToArray.length < 5) {
                    Rmsg = stringToArray[3];
                } else {
                    for (var a = 3; a < stringToArray.length; a++) {
                        Rmsg += stringToArray[a] + " ";
                    }
                }

                var count=0;
                var Recipient;
                for (key in names){
                    if(key.substr(0, 4)==stringToArray[2] && names[key][0]==stringToArray[1]){
                        Recipient = key;
                        count++;
                    }
                }

                if(count > 1 || count < 1){
                    socket.emit('message', recName, getID(socket.id, 4), '존재하지 않는 사용자입니다.', 'wrong',  time);
                    return;
                }
                message(recName, Rmsg, 'whisper', `${stringToArray[1]}에게 ${Rmsg}를 보냈습니다.`)
                socket.emit('message', recName, getID(socket.id, 4), '전송 성공.', 'Rename', time);
                return;
            }


            if (stringToArray[0] == '/강퇴') { //강퇴
                if (stringToArray[1] == password) {
                    if (stringToArray[2] == 'all') {
                        message(recName, '[공지]서버 재시작을 위해 모두 퇴장이 되셨습니다.', 'notice', `[공지]서버 재시작을 위해 모두 퇴장이 되셨습니다.`);
                        io.emit('GETOUT', true);
                        return;
                    }

                    io.to(names[socket.id][1]).emit('GETOUT');
                    message(name[stringToArray[2][0]], '님이 강퇴되셨습니다.', 'kick', names[stringToArray[2][0]] + '님이 강퇴되셨습니다.')
                }
                return;
            }


            if (stringToArray[0] == '/채팅리셋') { //채팅리셋
                if (stringToArray[1] == password) {
                    chattingsValue = [];
                    io.emit('resetmessage'); 
                    message(recName, recName + '님이 채팅을 리셋시켰습니다.', 'notice', '[' + socket.id + ']' + recName + '님이 채팅을 리셋시켰습니다.')
                }
                return;
            }

            
            if (stringToArray[0] == '/room') { //방변경
                //양식 : /room (name) (비밀번호[선택])
                    socket.emit('message', '이걸 왜 보냐', '이게 뭔지 암?', '<wrongman style = "color: red">현재 사용 가능한 명령어가 아닙니다.</wrongman>', 'wrong', time)
                    return;
                    if (stringToArray.length < 3) {
                        Rmsg = stringToArray[1];
                    } else {
                        for (var a = 2; a < stringToArray.length; a++) {
                            Rmsg += stringToArray[a] + " ";
                        }
                    }
                    socket.leave(names[socket.id][1]);
                    socket.join(Rmsg);
                    names[socket.id][1] = Rmsg;
                    socket.emit('message', recName, getID(socket.id, 4), `${Rmsg}(으)로 방을 성공적으로 변경하셨습니다.`, 'information', time);
                    
                return;
            }




            socket.emit('message', recName, getID(socket.id, 4), '<wrongman style = "color: red">잘못된명령어입니다.(/?)</wrongman>', 'wrong',  time);
            return;
        }

        message(recName, msg, 'chat', `[${socket.id}]${recName}: ${msg}`);
    });


    socket.on('ReName', function (msg) {
        //2차 검사.
        try{
        var oldMsg = names[socket.id][0];
        }catch (e){
            socket.emit('message', '알수없는사용자', '튕김증상', `<wrongman style = "color: red">${error('-9999')}</wrongman>`, 'wrong', time);
            return;
        }
        msg = msg.split(' ').join('');
        if (msg.length > 20 || msg == 'null' || msg == '' || msg == oldMsg)
            return;

        names[socket.id][0] = msg;

        message(msg, `${oldMsg}님이 ${msg}(으)로 이름을 변경하셨습니다.`, 'information', `[${socket.id}]${oldMsg} -> ${msg} (이름변경)`);
    });



    socket.on('CheckList', function () {
        socket.emit('return', Object.values(names));
    });





    socket.on('disconnect', function () {
        accessor--;
        io.emit('users.count', accessor);
        if (Array.from(socket.rooms)[1] == 'anteroom')
            return;

        try {
            message(names[socket.id][0], names[socket.id][0] + '님이 나가셨습니다.', 'information', `[${socket.id}]${names[socket.id][0]}나감`);
            names = ArrayKeyRemove(names, socket.id, 1);
        } catch (e) {}

    }); 

    function message(recName, msg, type, log) {
        try {
            let date = new Date();
            let time = date.getHours() + ":" + date.getMinutes();

            chattingsValue.push([recName, getID(socket.id, 4), msg, type, time, names[socket.id][1]]);
            socket.to(names[socket.id][1]).emit('message', recName, getID(socket.id, 4), msg, type, time);

            if (!log)
                return;

            console.log(log);
            saveLog(log);

        } catch (e) {
            console.log('error, 잘못된 message()반환');
        }
    }


});
/**새로운 방을 만드는 function (중복없음)*/
function RoomJoin() {
    roomList = new Set();
    var namevalues = Object.values(names);
    for (var a = 0; a < namevalues.length; a++) {
        roomList.add(namevalues[a][1]);
    }
}

function ArrayKeyRemove(arr, key, count) {
    var counted = 0;
    var newArr = new Array(arr.length);
    for (k in arr) {
        if (arr.hasOwnProperty) {
            if (count == counted) {
                newArr[k] = arr[k];
            } else {
                if (k != key) {
                    newArr[k] = arr[k];
                } else {
                    counted++;
                }
            }
        }
    }
    return newArr;
}

function GetIP(req, bool) {
    if (bool) {
        let gotip = GetIP(req).replaceAll('f', '');
        gotip = gotip.replaceAll(':', '');
        return gotip;
    }

    return requestIp.getClientIp(req);
}
/**로그를 시간에 따라 저장하는 function*/
function saveLog(data) {
    now = new Date();
    fs.appendFileSync(`log/${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}(log).txt`, data + '\n');
}

//*substr*/
function getID(str, a, b) {

    if (a == null) {
        a = 0;
        console.log('getID(socket, a, b)중에서 a부분이 null입니다. 빨랑 고치시오.');
    }

    if (b == null) {
        b=a;
        a=0;
    }
    return str.substr(a, b == 'max' ? str.length : b);
}
/**강력한 비밀번호를 만드는 function*/
function createPassworld(count){
    let chars =`0123456789!@#$%^&*()-_=+ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`;

    chars  = chars.replace(/01|i|I|O/g, "")

    const length = chars.length;
    let pw = "",
        tmp;

    for (let i = 0; i < count; i++) {
        const random = Math.floor(Math.random() * length);
        tmp = chars.charAt(random);
        pw = pw + tmp
    }

    return pw;
}

/**!!!구버전!!!비밀번호를 만드는 function*/
function _old_temp_pw_issuance(count) {
    let ranValue1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    let ranValue2 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    let ranValue3 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    let ranValue4 = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '-', '_', '=', '.'];

    var temp_pw = "";
    if (!count) {
        count = 5;
        console.log('temp_pw_issuance()에 값이 참조 되지 않아 기본값 5를 넣었습니다, 빠른 시일내에 고치세요.');
    }
    for (i = 0; i < count; i++) {

        let ranPick1 = Math.floor(Math.random() * ranValue1.length);
        let ranPick2 = Math.floor(Math.random() * ranValue2.length);
        let ranPick3 = Math.floor(Math.random() * ranValue3.length);
        let ranPick4 = Math.floor(Math.random() * ranValue4.length);
        temp_pw = temp_pw + ranValue1[ranPick1] + ranValue2[ranPick2] + ranValue3[ranPick3] + ranValue4[ranPick4];
    }

    return temp_pw;
}

/**error코드의 설명을 반환하는 function*/
function error(code){
    switch(code){
        case('-9999'):
            return `(오류)새로고침을 하세요.(-9999)`; //names에 없거나 잠시 튕긴경우, 혹은 재시작했지만 새로고침을 안했을 경우.

        case('-18'):
            return `(오류)알수 없음(-18)`; //말 그대로 -18인 경우.

    }
}


app.get('*', (req, res) => {
    res.send('알 수 없 는 페 이 지 But no problem!!!!, 아래 버튼을 누 른 다 면 된다!!!! 놀라운!!! 엄청난!!! new!!!' + `</br>
     <button type="button" class="navyBtn" onClick="location.href='https://iosis.kro.kr'">누르세요</button>`);
});
