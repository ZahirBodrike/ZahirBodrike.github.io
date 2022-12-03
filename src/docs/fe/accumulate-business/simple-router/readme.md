# 轻量级路由实现

[[toc]]

## 场景

主要集中在移动端 app 内嵌 H5 中， 其特点就是一到三个页面。

前端单页面应用的 nginx 配置也是我们无法控制的，在使用前端路由的情况下，只能使用 hash 模式。

客户端的 action 跳转满足了大部分页面间的跳转需求，除了在特定场景下页面跳转需要使用前端路由：例如直播间内的半屏弹窗，如果用 action 做多页面间跳转，用户体验非常不好。

在以上种种限定情况下，我们使用 vue-router 就显得有点“重”。并且路由动画也需要自己或者借助外部插件实现。

以下是可以不引入 vue-router 的一些场景，只要需要简单改造项目，帮你立省一个路由库的流量开销

## 跳转方式

### 1. 客户端新开 webview

这种情况可以不使用前端路由，只是在页面入口文件做一个简单的页面匹配即可，每次 action 跳转都根据 url 走全新的页面。

```js
// 简单的根据 hash 匹配页面
// vue / react 的写法大同小异

function simpleRouter() {
  const hash = window.location.hash;
  if (hash.indexOf("wallet") !== -1) {
    return Wallet;
  }
  if (hash.indexOf("modal") !== -1) {
    return Modal;
  }
  // 默认返回
  return Wallet;
}

const render = () => {
  new Vue({
    el: "body>div", // #app
    render: (h) => h(simpleRouter()),
  });
};

render();
window.onhashchange = () => render();
```

### 2. 在直播间这类特殊场景跳转，需要使用前端路由且有切换动画

在实现切换动画上，vue-router 可以搭配 transition-group 来做过渡动画，但无法实现页面间的连续切换，即前后两个页面不会在同一时间一起出现。

```
+---------------------------------------------------+
| +-----------------------------------------------+ |
| | www.ourwebsite.com/#/hashtag                  | |
| +-----------------------------------------------+ |
|                                                   |
|-----------------------+   +-----------------------|
|                       |   |                       |
|                       |   |                       |
|                       |   |                       |
|       page a          |   |     page b            |
|                       |   |                       |
|                       |   |                       |
|                       |   |                       |
+-+---------------------+---+---------------------+-+
```

利用 Vue 的动态组件和 hash 变化侦测，我们可以实现一个简单的路由：

1. 根据 hash 挂载对应的页面
2. 前后页面切换，有对应的前进后退动画

核心实现代码如下

```js
// hash 的所有变化都在此处处理，包括手动点击前进后退按钮和通过路由暴露的 api 来切换页面
window.onhashchange = (e) => {
  // 不能获知是前进还是后退
  if (e.newURL === e.oldURL) return;
  const _hash = new URL(e.newURL).hash;
  const _path = _hash.slice(1);
  // 切换到不同的页面
  this.switchPageByPath(_path);
};
```

我们无法获知页面间切换是前进还是后退源于浏览器 api 不支持，使用 vue-router 的情况下通行的实现方法就是对当前路径做判定，一级路径到下一级路径就是前进，反之就是后退。

```js
watch: {
  $route(to, from) {
    const toDepth = to.path.split("/").length;
    const fromDepth = from.path.split("/").length;
    this.transitionName = toDepth > fromDepth ? "fadeInRight" : "fadeInLeft";
  }
}
```

提前规划好路径的情况下，这可以满足大多数跳转场景。

当然更简单的情况下，我们只有两个到三个页面，页面的关系有简单的分支，不存在循环跳转的情况。

```
                +------+         +------+
                |      |         |      |
   +----------->+page a+--------->page b|
   |            |      |         |      |
   |            +------+         +------+
   |               1                3
+--+---+
|      |
|index | 0
|      |
+---+--+
    |
    |           +------+
    |           |      |
    +---------->+page c|
                |      |
                +------+
                    2
```

或者干脆就是线性的

```
+-------+          +-------+         +-------+
|       |          |       |         |       |
|index  +--------->+page a +--------->page b |
|       |          |       |         |       |
+-------+          +-------+         +-------+
    0                  1                 2
```

只要前后页面的下标能描述前后关系【数字比较小的页面是前页，数字比较大为后页】，我们就可以依靠一个数组来描述页面间的跳转关系，从而实现正确的切换动画。

```js
// 内部跳转策略，显式调用 back forward 等 api 情况下，已经知道 direction 是前进还是后退
if (this.direction !== DIRECTION.UNKNOWN) {
  this.switchPage();
  return;
}
// 默认跳转策略 数字比较小的页面是前页，数字比较大为后页
if (this.prevIndex > this.index) this.direction = DIRECTION.NEXT;
if (this.prevIndex > this.index) this.direction = DIRECTION.PREV;
this.switchPage();
```

因为涉及到同一时间存在两个页面的时机，即前后页的无缝切换，按照需不需要页面缓存有以下的实现方式。

```jsx
render() {
// pageList 就是页面数组，下标描述了页面的前后关系
// 使用 keep-alive 的情况下，pageList 需要应用初始化就确定，是否显示页面必须通过 v-if 来控制，只有这样这样页面组件内的生命周期函数才能正确调用
// 不使用 keep-alive 的情况下，其实可以动态插入页面对象到数组，通过 this.pageList 数组项的增减来控制页面的显示，
  return (
    <div
      class="simple-router"
      style={this.switchAnim}
      onTransitionend={this.handleTransitionend}
    >
      {this.pageList.map(page => (
        <keep-alive>
          {page.visible ? (
            <page.component
              key={page.name}
              class="simple-router-item"
            />
          ) : (
            ''
          )}
        </keep-alive>
      ))}
    >/div>
  )
}
```
