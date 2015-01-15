var wxConnect = require('wx-connect');
var model = require('./model');

var config = {
  appID: 'wxd59a79ed8e3fab89',
  appSecret: '',
  appToken: 'WXConnect'
};

var app = wxConnect(config);
// 文本消息处理
app.text = function(req, res, next) {
  model.weather(req.message.content, function(err, info) {
    if (err) return next(new Error('天气信息获取失败！'));
    if (!info) {
      return res.reply({msgType: 'text', content: '没有找到您输入的地方！'});
    }

    res.news(info);
  });
};

// 地理位置上报事件处理
app.location = function(req, res, next) {
  var id = 'user:' + req.message.fromUserName;
  var location = {
    longitude: req.message.longitude,
    latitude: req.message.latitude,
    precision: req.message.precision
  };

  model.userLocationWeather(id, location, function(err, info) {
    if (err) return next(err);
    if (!info) {
      return res.reply({msgType: 'text', content: '没有找到您输入的地方！'});
    }

    res.news(info);
  });
};

// 定义菜单点击事件处理
app.menu = function(req, res, next) {
  console.log(next);
  model.city(req.message, function(err, location) {
    if (err) return next(new Error('获取用户位置失败！'));
    model.weather(location, function(err, info) {
      if (err) return next(err);
      if (!info) {
        return res.reply({msgType: 'text', content: '没有找到您输入的地方！'});
      }

      res.news(info);
    })
  });
};

// 用户关注事件处理
app.subscribe = function(req, res, next) {
  model.subscribe(req.message, function(err) {
    if (err) return next(new Error('Redis：保存关注用户失败！'));

    res.text('感谢订阅，您可以点击菜单查看城市天气或者在聊天框输入您要看的城市！');
  })
};

// 用户取消关注事件处理
app.unsubscribe = function(req, res, next) {
  model.unsubscribe(req.message, function(err) {
    if (err) return next(new Error('Redis：用户取消关注保存失败！'));
    res.end('');
  });
};

// 启动server
app.listen(80, function() {
  console.log('Server is running on 80'); // 注意：微信公众号接口只支持80端口
});
