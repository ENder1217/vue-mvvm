# vue-mvvm


vue的mvvm实现，通过代码实现一个超级简单的mvvm的功能，具体的代码移步git链接：

**VUE的数据的双向同步，主要通过 defineProperty把数据转化为getter与setter。**

一个简单的分工流涉及到几个对象：
![vue](./vue.jpg)
图中：
 - 绿色：Observer，负责数据劫持，增加getter、setter
 - 蓝色：Watcher，订阅Observer的setter触发的钩子
 - 黄色：Compile，解析模板，分析每个节点和model上的数据关系
 - 灰色：模板、视图

大家看代码的文件顺序建议为：Observer -> Compile -> Watcher -> Vue

Observe：
-------

 1. 使用Object.defineProperty将数据转化为getter与setter
 2. 这个文件主要完成，将一个对象的属性在getter、setter阶段增加数据劫持，在getter阶段增加事件订阅，在setter节点发布事件，触发订阅者回调

Compile：
-------
compile负责的是模板编辑解析，将DOM元素解析，找出指令和占位符，和Watcher建立关系，Watcher把订阅关系注册到Observer的监听队列里，当Observer发布消息时进行视图的更新
**作用：**
 1. 页面初始化的时候  解析出模板（页面），把数据填充上
 2. 数据发生变化的时候，update(),把新的数据更新到模板上

Watcher：
-------
Watcher订阅者作为Observer和compile的桥梁，主要做的事件是：

 1. 自身实例化的时候，往订阅器（Dep）中添加自己进行依赖收集（这个过程是自动调用Observer的getter，并且把自己添加到对应的data.xxx的订阅器中）
 2. 自身有一个update()方法
 3. 当属性发生改变，调用Dep.notify()发布事件，Watcher调用自身的update方法，并触发compile中绑定的回调

Vue
---
Vue作为数据绑定的入口，整合Observer、Compile和Watcher三者

 1. 通过Observer来监听自己的model数据变化
 2. 通过Compile来解析编译模板指令
 3. 最终利用Watcher搭起Observer和Compile之间的通信桥梁
 4. 达到数据变化 -> 视图更新；视图交互变化(input) -> 数据model变更的双向绑定效果。