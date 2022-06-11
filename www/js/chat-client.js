$(function() {
    // io-client
    // 客户端通过 socket.io 模块的实例化对象 io 建立与服务端的连接
    // 连接成功会触发服务器端的connection事件
    var socket = io(); 

    // 点击输入昵称，回车登录
    $('#name').keyup((ev)=> {
      if(ev.which == 13) {
        inputName();
      }
    });
    $('#nameBtn').click(inputName);

    // 登录成功，隐藏登录层
    socket.on('loginSuc', ()=> { 
      $('.name').hide(); 
    })
    socket.on('loginError', ()=> {
      alert('用户名已存在，请重新输入！');
      $('#name').val('');
    }); 

    function inputName() {
      var imgN = Math.floor(Math.random()*4)+1; // 随机分配头像
      if($('#name').val().trim()!=='')
          socket.emit('login', {  // 触发服务器端登录事件
            name: $('#name').val(),
            img: 'image/user' + imgN + '.jpg'
          });
      return false; 
    }

    // 系统提示消息
    socket.on('system', (user)=> { 
      var data = new Date().toTimeString().substr(0, 8);
      $('#messages').append(`<p class='system'><span>${data}</span><br /><span>${user.name}  ${user.status}了聊天室<span></p>`);
      // 滚动条总是在最底部
      $('#messages').scrollTop($('#messages')[0].scrollHeight);
    });

    // 监听抖动事件
    socket.on('shake', (user)=> { 
      var data = new Date().toTimeString().substr(0, 8);
      $('#messages').append(`<p class='system'><span>${data}</span><br /><span>${user.name}发送了一个窗口抖动</span></p>`);
      shake();
      // 滚动条总是在最底部
      $('#messages').scrollTop($('#messages')[0].scrollHeight);
    });

    // 显示在线人员
    socket.on('disUser', (usersInfo)=> {
      displayUser(usersInfo);
    });

    // 发送消息
    // 点击按钮或回车键发送消息
    $('#sub').click(sendMsg);
    $('#m').keyup((ev)=> {
      if(ev.which == 13) {
        sendMsg();
      }
    });

    // 接收消息
    // 服务器端接受到来自用户的消息后会触发客户端的 receiveMsg 事件，并将用户发送的消息作为参数传递，该事件会向聊天面板添加聊天内容
    // 由于发送的是图片，所以对页面布局难免有影响，为了页面美观客户端在接收其他用户发送的消息的时候会先判断发送的是文本还是图片，根据不同的结果展示不同布局。判断的方法是在客户发送消息的时候传入一个 type，根据 type 的值来确实发送内容的类型。所以上面发送图片代码中触发了 sendMsg 事件，传入参数多了一个 type 属性。
    socket.on('receiveMsg', (obj)=> {   // 将接收到的消息渲染到面板上
      // 发送为图片
      if(obj.type == 'img') {
        $('#messages').append(`
          <li class='${obj.side}'>
            <img src="${obj.img}">
            <div>
              <span>${obj.name}</span>
              <p style="padding: 0;">${obj.msg}</p>
            </div>
          </li>
        `); 
        // 滚动条总是在最底部
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
        return;
      }

      // 提取文字中的表情加以渲染
      var msg = obj.msg;
      var content = '';
      while(msg.indexOf('[') > -1) {  // 其实更建议用正则将[]中的内容提取出来
        var start = msg.indexOf('[');
        var end = msg.indexOf(']');

        content += '<span>'+msg.substr(0, start)+'</span>';
        content += '<img src="image/emoji/emoji%20('+msg.substr(start+6, end-start-6)+').png">';
        msg = msg.substr(end+1, msg.length);
      }
      content += '<span>'+msg+'</span>';
      
      $('#messages').append(`
        <li class='${obj.side}'>
          <img src="${obj.img}">
          <div>
            <span>${obj.name}</span>
            <p style="color: ${obj.color};">${content}</p>
          </div>
        </li>
      `);
      // 滚动条总是在最底部
      $('#messages').scrollTop($('#messages')[0].scrollHeight);
    }); 


    // 发送消息
    var color = '#000000'; 
    function sendMsg() { 
      if($('#m').val() == '') { // 输入消息为空
        alert('请输入内容！');
        return false;
      }
      color = $('#color').val(); 
      socket.emit('sendMsg', {
        msg: $('#m').val(),
        color: color,
        type: 'text'
      });
      $('#m').val(''); 
      return false; 
    }

    var timer;
    function shake() {
      $('.main').addClass('shaking');
      clearTimeout(timer);
      timer = setTimeout(()=> {
        $('.main').removeClass('shaking');
      }, 500);
    }

    // 显示在线人员
    function displayUser(users) {
      $('#users').text(''); // 每次都要重新渲染
      if(!users.length) {
        $('.contacts p').show();
      } else {
        $('.contacts p').hide();
      }
      $('#num').text(users.length);
      for(var i = 0; i < users.length; i++) {
        var $html = `<li>
          <img src="${users[i].img}">
          <span>${users[i].name}</span>
        </li>`;
        $('#users').append($html);
      }
    }

    // 清空历史消息
    $('#clear').click(()=> {
      $('#messages').text('');
      socket.emit('disconnect');
    });
 
    // 发送表情其实很简单，将表情图片放在 li 中，当用户点击 li 时就将表情的 src 中的序号解析出来，用 [emoji + 表情序号] 的格式存放在聊天框里，点击发送后再解析为 src。就是一个解析加还原的过程，这一过程中我们的服务器代码不变，需要改变的是客户端监听的 receiveMsg 事件

    // 渲染表情
    init();
    function init() {
      for(var i = 0; i < 141; i++) {
        $('.emoji').append('<li id='+i+'><img src="image/emoji/emoji ('+(i+1)+').png"></li>');
      }
    }

    // 显示表情选择面板
    $('#smile').click(()=> {
      $('.selectBox').css('display', "block");
    });
    $('#smile').dblclick((ev)=> { 
      $('.selectBox').css('display', "none");
    });  
    $('#m').click(()=> {
      $('.selectBox').css('display', "none");
    }); 

    // 用户点击发送表情
    $('.emoji li img').click((ev)=> {
        ev = ev || window.event;
        var src = ev.target.src;
        var emoji = src.replace(/\D*/g, '').substr(6, 8); // 提取序号
        var old = $('#m').val(); // 用户输入的其他内容
        $('#m').val(old+'[emoji'+emoji+']');
        $('.selectBox').css('display', "none");
    });

    // 当用户点击抖动按钮时会 emit 服务端的抖动事件，服务端会广播该事件使得每个客户端都会抖动窗口
    // 用户发送抖动
    $('.edit #shake').click(function() {
        socket.emit('shake');
    });

    // 用户发送图片
    // 用了 fileReader 对象，可以将我们选中的文件已 64 位输出，然后将结果存放在 reader.result 中，我们选中图片之后，reader.result 就存放的是图片的 src
    $('#file').change(function() {
      var file = this.files[0];  // 上传单张图片
      var reader = new FileReader();

      //文件读取出错的时候触发
      reader.onerror = function(){
          console.log('读取文件失败，请重试！'); 
      };
      // 读取成功后
      reader.onload = function() {
        var src = reader.result;  // 读取结果
        var img = '<img class="sendImg" src="'+src+'">';
        socket.emit('sendMsg', {  // 发送
          msg: img,
          color: color,
          type: 'img' // 发送类型为img
        }); 
      };
      reader.readAsDataURL(file); // 读取为64位
    });
});