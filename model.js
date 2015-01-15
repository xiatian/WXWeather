var request = require('request');
var redis = require('redis').createClient();
redis.on('error', function(err) {
  //throw new Error('Redis服务器连接失败！');
});

var api = 'http://api.map.baidu.com/telematics/v3/weather?location={{location}}&output=json&ak=8d1adf74721c74049b3a34cead2af7a0';

// 通过百度天气API获取城市或者经纬度的天气数据
exports.weather = weather = function(location, cb) {
  var url = api.replace('{{location}}', location);
  request.get(url, {json: true}, function(err, _, data) {
    if (err) return cb(err);

    if (data.error) {
      return cb(null, null);
    }

    var result = data.results[0];
    var content = [];
    result.weather_data.forEach(function(item) {
      var info = {};
      if (content.length == 0) {
        info.title = result.currentCity + '天气预报';
        info.picurl = item.dayPictureUrl;
        content.push(info);

        var summary = [item.weather, item.wind, item.temperature];
        if (result.index.length) {
          summary.push(result.index[0].des);
        }
        content.push({title: summary.join('，'), picurl: item.dayPictureUrl});
      } else {
        info.title = item.date + ' ' + [item.weather, item.wind, item.temperature].join('，');
        info.picurl = item.dayPictureUrl;
        content.push(info);
      }
    });

    cb(null, content);
  });
};

// 获取事件KEY标识对应的城市名，当前城市从用户上报的地理位置中获取
exports.city = function(message, cb) {
  var cityMap = {
    'CITY_BJ': '北京',
    'CITY_SH': '上海',
    'CITY_GZ': '广州',
    'CITY_SZ': '深圳',
    'CITY_CD': '成都'
  };

  if (message.eventKey !== 'CITY_CURRENT') {
    return cb(null, cityMap[message.eventKey]);
  } else {
    redis.hgetall('user:' + message.fromUserName, function(err, data) {
      if (err) return cb(err);
      cb(null, data.longitude + ',' + data.latitude);
    });
  }
};

// 保存用户上报的地理位置，并返回该地方的天气信息
exports.userLocationWeather = function(id, location, cb) {
  redis.hmset(id, location, function(err, _) {
    if (err) return cb(err);

    weather(location.longitude + ',' + location.latitude, function(err, content) {
      if (err) return cb(err);

      cb(null, content);
    });
  });
};

// 将订阅的用户信息保存到redis中
exports.subscribe = function(message, cb) {
  var id = 'user:' + message.fromUserName;
  var user = {id: message.fromUserName, followTime: message.createTime};
  redis.hmset(id, user, function(err, _) {
    if (err) return cb(err);
    cb(null);
  });
};

// 标识取消订阅的用户
exports.unsubscribe = function(message, cb) {
  var id = 'user:' + message.fromUserName;
  redis.hmset(id, {unsubscribe: new Date()}, function(err, _) {
    if (err) return cb(err);
    cb(null);
  });
};