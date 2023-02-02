# 聊天机器人+serverless

企业微信机器人：就是可以在群组添加的机器人，可以获取到 webhook 地址，然后开发者用户按以下说明构造 post data 向这个地址发起 HTTP POST 请求，即可实现给该群组发送消息

Webhooks 是"user-defined HTTP 回调"。它们通常由一些事件触发，例如"push 代码到 repo"，或者"post 一个评论到博客"。

## 1. 企业微信群聊机器人发送推送消息

我们在群组里面添加了企业微信机器人之后，会有一个 webhook 地址，例如(https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx) 然后我们可以通过传参请求接口地址的方式，即可通过机器人给该群组发送消息。

```js
// 文本类型
{
    "msgtype": "text",
    "text": {
        "content": "广州今日天气：29度，大部分多云，降雨概率：60%",
        "mentioned_list":["wangqing","@all"],
        "mentioned_mobile_list":["13800001111","@all"]
    }
}

// markdown类型
{
    "msgtype": "markdown",
    "markdown": {
        "content": "实时新增用户反馈<font color=\"warning\">132例</font>，请相关同事注意。\n
         >类型:<font color=\"comment\">用户反馈</font>
         >普通用户反馈:<font color=\"comment\">117例</font>
         >VIP用户反馈:<font color=\"comment\">15例</font>"
    }
}

// 图片类型
{
    "msgtype": "image",
    "image": {
        "base64": "DATA",
        "md5": "MD5"
    }
}

// 图文类型
{
    "msgtype": "news",
    "news": {
       "articles" : [
           {
               "title" : "中秋节礼品领取",
               "description" : "今年中秋节公司有豪礼相送",
               "url" : "www.qq.com",
               "picurl" : "http://res.mail.qq.com/node/ww/wwopenmng/images/independent/doc/test_pic_msg1.png"
           }
        ]
    }
}

// 文件类型
{
    "msgtype": "file",
    "file": {
         "media_id": "3a8asd892asd8asd"
    }
}
```

⚠️：消息发送频率限制，每个机器人发送的消息不能超过 20 条/分钟。

## 2. 配合 Serverless

阿里云函数计算:阿里云函数计算是事件驱动的全托管计算服务。通过函数计算，您无需管理服务器等基础设施，只需编写代码并上传。而且，您只需要为代码实际运行所消耗的资源付费，代码未运行则不产生费用。

定时机器人的实现原理：通过阿里云的函数计算的 node 事件函数+定时触发器，定时唤起机器人，从而实现定时通知小助手

```js
1、创建事件函数
exports.handler = function(event, context, callback) {
  callback(null, 'hello world');
};

2、创建本地项目

const axios = require('axios');
const baseUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx';
const t = new Date().getDay();
async function bookLunch() {
    let result = await axios.post(baseUrl, {
        msgtype: 'markdown',
        markdown: {
            content: "今天是<font color=\"warning\">周" + t + "</font>，请相关同事注意。"
        }
    })

    return result.data
}
exports.handler = function (event, context, callback) {
    bookLunch()
    var eventObj = JSON.parse(event.toString());
    callback(null, eventObj['key']);
};
再上传文件夹到创建的事件函数中。

3、创建触发器
设置时间出发器、触发时间间隔
```
