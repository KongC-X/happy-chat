var express = require('express');
var app = express();
var http = require('http').Server(app);
// 思考：socket.io作为一个函数，当前http作为参数传入生成一个io对象？

// io-server
var io = require("socket.io")(http);

var users = []; // 储存登录用户
var usersInfo = [];  // 存储用户姓名和头像

// 开启静态资源服务器
// 路由为/默认www静态文件夹
// express.static是express提供的内置中间件，用来设置静态文件目录，这个文件夹里的文件 html、css、js 彼此可以用相对路径,可以直接访问图片等静态资源
app.use('/', express.static(__dirname + '/www'));
 
// 每个连接的用户都有专有的socket

// socket.io 的语法前后端通用，通过 socket.emit () 触发事件，通过 socket.on () 来监听和处理事件，通过传递的参数进行通信
/* 
   io.emit(foo); //会触发所有用户的foo事件
   socket.emit(foo); //只触发当前用户的foo事件
   socket.broadcast.emit(foo); //触发除了当前用户的其他用户的foo事件
*/

// 服务端通过 connection 监听客户端的连接,只要有客户端连接就执行回调函数
io.on('connection', (socket)=> {
    // 渲染在线人员
    io.emit('disUser', usersInfo);

    // 登录，检测用户名是否已存在
    socket.on('login', (user)=> {
        if(users.indexOf(user.name) > -1) { // 昵称是否存在
            socket.emit('loginError'); // 触发客户端的登录失败事件
        } else {
            users.push(user.name); //储存用户的昵称
            usersInfo.push(user); // 储存用户的昵称和头像

            socket.emit('loginSuc'); // 触发客户端的登录成功事件
            socket.nickname = user.name;
            io.emit('system', { // 向所有用户广播该用户进入房间
                name: user.name,
                status: '进入'
            });
            io.emit('disUser', usersInfo); // 渲染右侧在线人员信息
            console.log(users.length + ' user connect.'); // 打印连接人数
        }
    });

    // 发送窗口抖动
    // 服务端会广播该事件使得每个客户端都会抖动窗口
    socket.on('shake', ()=> {
        socket.emit('shake', {
            name: '您'
        });
        socket.broadcast.emit('shake', {
            name: socket.nickname
        });
    });

    // 发送消息事件
    // 用户发送消息时触发服务器端的 sendMsg 事件，并将消息内容作为参数，服务器端监听到 sendMsg 事件之后向其他所有用户广播该消息，用的 socket.broadcast.emit (foo)
    socket.on('sendMsg', (data)=> {
        var img = '';
        for(var i = 0; i < usersInfo.length; i++) {
            if(usersInfo[i].name == socket.nickname) {
                img = usersInfo[i].img;
            }
        }
        socket.broadcast.emit('receiveMsg', { // 向除了发送者之外的其他用户广播
            name: socket.nickname,
            img: img,
            msg: data.msg,
            color: data.color,
            type: data.type,
            side: 'left'
        });
        socket.emit('receiveMsg', { // 向发送者发送消息，为什么分开发送？因为css样式不同
            name: socket.nickname,
            img: img,
            msg: data.msg,
            color: data.color,
            type: data.type,
            side: 'right'
        });
    });  

    // 断开连接时
    socket.on('disconnect', ()=> {
        var index = users.indexOf(socket.nickname); 
        if(index > -1 ) {  // 避免是undefined
            users.splice(index, 1);  // 删除用户信息
            usersInfo.splice(index, 1);  // 删除用户信息

            io.emit('system', {  // 系统通知
                name: socket.nickname,
                status: '离开'
            });
            
            io.emit('disUser', usersInfo);  // 重新渲染
            console.log('a user left.');
        }
    });
});

http.listen(3000, function() {
    console.log('listen 3000 port.');
});