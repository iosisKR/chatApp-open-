const express = require('express');
const requestIp = require('request-ip');
const app = express();
const socket = require('socket.io');
const request = require('request');
const multer = require("multer");
const fs = require('fs');

const port = 3000;
const domain = '여기에 도메인 입력';
let password = createPassworld( Math.floor((Math.random() * 40) + 20));

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

app.get('/ip', (req, res) => {
    res.send('IP : ' + GetIP(req, true));
});

app.use(express.static('page'));

//<<<Socket.io>>>
let accessor = 0; //현재 동시접속자수입니다.
let names = []; //[socket.id : name, roomName]
let chattingsValue = []; //채팅기록. [name, id, msg, type, date, roomName]
let rooms = []; //[roomName : 비번 [접속자들]]

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
        let date = new Date();
        let time = date.getHours() + ":"+ date.getMinutes();
        if(Array.from(socket.rooms)[1]=='anteroom')
            return;

        try{
        var recName = names[socket.id][0]; //rec(전송자)이름
        } catch (e){
            socket.emit('message', '알수없는사용자', '튕김증상', `<wrongman style = "color: red">${error(-9999)}</wrongman>`, 'wrong', time);
            return;
        }

        console.log(`[${socket.id}]${recName}: ${msg}`);
        saveLog(`[${socket.id}]${recName}: ${msg}`);


        //<이미지>
        if(type=='image'){
            chattingsValue.push([recName, getID(socket.id, 4), msg, 'image', time, names[socket.id][1]]);
            socket.to(names[socket.id][1]).emit('message', recName, getID(socket.id, 4), msg, 'image', time);
            return;
        }

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
                    chattingsValue.push([recName, getID(socket.id, 4), Rmsg, 'notice', time, names[socket.id][1]]);
                    io.to(names[socket.id][1]).emit('message', recName, getID(socket.id, 4), Rmsg, 'notice', time);
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

                console.log(`${stringToArray[1]}에게 ${Rmsg}를 보냈습니다.`);
                saveLog(`${stringToArray[1]}에게 ${Rmsg}를 보냈습니다.`);
                socket.emit('message', recName, getID(socket.id, 4), '전송 성공.', 'Rename', time);
                io.to(Recipient).emit('message', recName, getID(socket.id, 4), Rmsg, 'whisper', time);
                return;
            }


            if (stringToArray[0] == '/강퇴') { //강퇴
                if (stringToArray[1] == password) {
                    if (stringToArray[2] == 'all') {
                        chattingsValue.push([recName, getID(socket.id, 4), '[공지]서버 재시작을 위해 모두 퇴장이 되셨습니다.', 'notice', time, names[socket.id][1]]);
                        saveLog(`[공지]서버 재시작을 위해 모두 퇴장이 되셨습니다.`);
                        io.to(names[socket.id][1]).emit('message', recName, getID(socket.id, 4), '[공지]서버 재시작을 위해 모두 퇴장이 되셨습니다.', 'notice', time);
                        io.to(names[socket.id][1]).emit('GETOUT', true);
                        return;
                    }

                    io.emit('GETOUT');
                    chattingsValue.push([names[stringToArray[2][0]], getID(socket.id, 4), '님이 강퇴되셨습니다.', 'kick', time, names[socket.id][1]]);
                    saveLog(names[stringToArray[2][0]] + '님이 강퇴되셨습니다.');
                    io.to(names[socket.id][1]).emit('message', names[stringToArray[2][0]], getID(socket.id, 4), '님이 강퇴되셨습니다.', 'kick', time);
                }

                return;
            }


            if (stringToArray[0] == '/채팅리셋') { //채팅리셋
                if (stringToArray[1] == password) {
                    chattingsValue = [];
                    io.to(names[socket.id][1]).emit('resetmessage');
                    chattingsValue.push([recName, getID(socket.id, 4), '님이 채팅을 리셋시켰습니다.', 'notice', time, names[socket.id][1]]);
                    saveLog('[' + socket.id + ']' + recName + '님이 채팅을 리셋시켰습니다.');
                    io.to(names[socket.id][1]).emit('message', recName, getID(socket.id, 4), recName + '님이 채팅을 리셋시켰습니다.', 'notice', time);
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

        if(msg.slice(0, 4)=='blob'){
            chattingsValue.push([recName, getID(socket.id, 4), msg, 'image', time, names[socket.id][1]]);
            socket.to(names[socket.id][1]).emit('message', recName, getID(socket.id, 4), msg, 'image', time);
            return;
        }
        chattingsValue.push([recName, getID(socket.id, 4), msg, 'chat', time, names[socket.id][1]]);
        socket.to(names[socket.id][1]).emit('message', recName, getID(socket.id, 4), msg, 'chat', time);
    });


    socket.on('ReName', function (msg) {
        //2차 검사.
        try{
        var oldMsg = names[socket.id][0];
        }catch (e){
            socket.emit('message', '알수없는사용자', '튕김증상', `<wrongman style = "color: red">${error(-9999)}</wrongman>`, 'wrong', time);
            return;
        }
        msg = msg.split(' ').join('');
        if (msg.length > 20 || msg == 'null' || msg == '' || msg == oldMsg)
            return;

        let date = new Date();
        let time = date.getHours() + ":"+ date.getMinutes();
        names[socket.id][0] = msg;
        console.log(`[${socket.id}]${oldMsg} -> ${msg} (이름변경)`);
        saveLog(`[${socket.id}]${oldMsg} -> ${msg} (이름변경)`);
        chattingsValue.push([msg, getID(socket.id, 4), `${oldMsg}님이 ${msg}(으)로 이름을 변경하셨습니다.`, 'information', time, names[socket.id][1]]);
        io.to(names[socket.id][1]).emit('message', msg, getID(socket.id, 4), `${oldMsg}님이 ${msg}(으)로 이름을 변경하셨습니다.`, 'information', time);
    });



    socket.on('CheckList', function () {
        socket.emit('return', Object.values(names));
    });





    socket.on('disconnect', function () {
        accessor--;
        io.emit('users.count', accessor);
        //만약 방이 room선택하는곳이라면 어쩌고저쩌고
        if (Array.from(socket.rooms)[1] == 'anteroom') {
        } else {
            let date = new Date();
            let time = date.getHours() + ":" + date.getMinutes();
            try {
                console.log(names[socket.id][0] + ' 나감');
                saveLog(`[${socket.id}]${names[socket.id][0]}나감`);
                chattingsValue.push([names[socket.id][0], getID(socket.id, 4), names[socket.id][0] + '님이 나가셨습니다.', 'information', time, names[socket.id][1]]);
                io.to(names[socket.id][1]).emit('message', names[socket.id][0], getID(socket.id, 4), names[socket.id][0] + '님이 나가셨습니다.', 'information', time);
                names = ArrayKeyRemove(names, socket.id, 1);
            } catch (e) {
                console.log('알 수 없는 사용자가 나갔습니다');
            }
        }
        
    }); 

        
    function RoomJoin(){
        roomList = new Set();
        var namevalues = Object.values(names);
        for (var a = 0; a < namevalues.length; a++) {
            roomList.add(namevalues[a][1]);
        }
    }

});

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
     <button type="button" class="navyBtn" onClick="location.href='/'">누르세요</button>`);
});