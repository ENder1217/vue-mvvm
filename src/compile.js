/**
 *  compile的作用是模板解析，将DOM元素解析，找出指令和占位符，与Watcher建立关系，
 *  Watcher把订阅关系注册到Observer的监听队列里，当Observer发布消息时，
 *  根据不同的指令，进行不同的操作
 *
 */

/**
 * compile的作用有主要两个：
 * 1.页面初始化的时候 解析出模板（页面），把数据填充上
 * 2.数据发生变化的时候，watcher执行update()方法后把新的数据更新到模板上
 *
 */


/**
 * Compile的构造函数
 *
 * @protected
 * @method
 * @param {Node} el  -Vue实例渲染的节点
 * @param {Object}  vm  -当前Vue实例
 * @returns {void}
 */
function Compile(el, vm) {
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);
    if (this.$el) {
        // 因为对DOM操作比较频繁会影响性能，所以创建一个文档碎片，所有的操作都基于此文档碎片
        this.$fragment = this.node2fragment(this.$el);
        // 编译解析模板
        this.init();
        // 最后一次性把文档碎片插入到页面(模板)中
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype.init = function(){
    this.compileElement(this.$fragment);
};

Compile.prototype.node2fragment = function(el){
    var fragment = document.createDocumentFragment(),
        child;

    // 将原生节点拷贝到fragment
    while (child = el.firstChild) {
        fragment.appendChild(child);
    }

    return fragment;
};

// 分析模板，递归解析DOMTree，解析出指令
Compile.prototype.compileElement = function(el){
    var childNodes = el.childNodes,
        _self = this;

    // 处理所有的子节点
    __arrayProto.slice.call(childNodes).forEach(function(node){
        var text = node.textContent,
            reg = /\{\{(.*)\}\}/;   // 正则匹配表达式{{xxx}}

        if (_self.isElementNode(node)) {
            // 参数是DOM节点则解析该节点
            _self.compile(node);
        }else if (_self.isTextNode(node) && reg.test(text)) {
            // 参数是表达式exp则解析表达式
            _self.compileText(node, RegExp.$1);
        }
        // 如果当前节点有子节点则递归调用
        if (node.childNodes && node.childNodes.length) {
            _self.compileElement(node);
        }
    });
};

// 解析单个DOM节点，包括节点的属性
Compile.prototype.compile = function(node){
    var nodeAttrs = node.attributes,
        _self = this;

    // 处理单个节点的属性
    __arrayProto.slice.call(nodeAttrs).forEach(function(attr){
        attrName = attr.name;

        // 是否为vue指令
        if (_self.isDirective(attrName)) {
            var attrVal = attr.value,
                // 取出具体指令值，如v-model==> model, v-on ==> on
                directive = attrName.substring(2);

            // 是否为事件指令
            if (_self.isEventDirective(directive)) {
                compileUtil.eventHandler(node, _self.$vm, attrVal, directive);
            }else {
                compileUtil[directive] && compileUtil[directive](node, _self.$vm, attrVal);
            }
            // 指令属性，最后移除
            node.removeAttribute(attrName);
        }
    });
};

Compile.prototype.compileText = function (node, exp) {
    compileUtil.text(node, this.$vm, exp);
};

// 判断一个节点属性是否为vue指令
Compile.prototype.isDirective = function (attr) {
    // 假设所有指令都以'v-'开头
    return attr.indexOf('v-') === 0;
};

// 添加事件指令判断v-on:click = "doSomething"
Compile.prototype.isEventDirective = function (directive) {
    return directive.indexOf('on') === 0;
};

// 判断一个节点是否为元素
Compile.prototype.isElementNode = function (node) {
    return node.nodeType === 1;
};

// 判断是否为元素或属性中的文本内容
Compile.prototype.isTextNode =function (node) {
    return node.nodeType === 3;
};


//----------------指令处理集合（把指令处理的一些方法单独抽出来）-------------------

var compileUtil = {
    /**
     * 将model与view绑定起来
     * 进行model-->view 同步
     *
     * @param {Node}   node        -dom节点
     * @param {Object} vm          -当前Vue实例
     * @param {String} exp         -指令的值
     * @param {String} directive   -指令的类型
     *
     */
    bind: function (node, vm, exp, directive) {
        var updaterFn = updater[directive + 'Updater'];

        // 初始化时会首先把data的数据同步到视图上
        updaterFn && updaterFn(node, this._getVMValue(vm, exp));

        // 当vm的exp属性发生改变，就会调用setter触发事件执行updaterFn回调函数
        new Watcher(vm, exp, function (newValue, oldValue) {
            updaterFn && updaterFn(node, newValue, oldValue);
        });
    },

    /**
     * text、html、model、class 参数都一样
     * @param {Node} node    -dom节点
     * @param {Object} vm    -当前Vue实例
     * @param {String} exp   -指令的值 如：v-html={htmlxxx} ==> exp为 htmlxxx
     */
    text: function (node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    html: function (node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    class: function (node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    // v-model指令为双向绑定需要给当前node添加input事件
    model: function (node, vm, exp) {
        this.bind(node, vm, exp, 'model');
        // 下面就是为了做到view-->model 同步
        var _self = this,
            oldValue = this._getVMValue(vm, exp); // 先将初始值保存起来

        node.addEventListener('input', function(e){
            var newValue = e.target.value;
            // 如果输入的值和vm实例里data的值一样则返回
            if (oldValue === newValue) {
                return;
            }
            _self._setVMValue(vm, exp, newValue);
            oldValue = newValue;
        });
    },

    // 事件处理，在vue中事件指令一般为“v-on:click = {xxx}”
    eventHandler: function (node, vm, exp, directive) {
        // 剥离出具体的事件名
        var eventType = directive.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];   //在vue实例定义的methods中找出对应的函数

        if (eventType && fn) {
            // 为当前node节点添加事件
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    // 获取当前vue实例下key为exp的值
    _getVMValue: function (vm, exp) {
        var vmValue = vm._data;

        exp = exp.split('.');
        exp.forEach(function(v) {
            vmValue = vmValue[v];
        });
        return vmValue;
    },

    // 设置当前vue实例下key为exp的值
    _setVMValue: function (vm, exp, val) {
        var vmValue = vm._data;

        exp = exp.split('.');
        exp.forEach(function (v, idx) {
            // 需要绑定的是最里面的值，如果不是就向内搜索
            if (idx < exp.length - 1) {
                vmValue = vmValue[v];
            }else {
                vmValue[v] = val;
            }
        });
    }
};


//----------------update 的几种类型的的处理-------------------
/**
 * textUpdater: 文本内容更新
 *
 * htmlUpdater： innerHTML更新
 *
 * classUpdater： className 更新
 *
 * modelUpdater： value更新，这个一般是指表单，如input采用value属性。
 */
var updater = {
    textUpdater: function (node, newValue) {
        node.textContent = typeof newValue == 'undefined' ? '' : newValue;
    },

    htmlUpdater: function (node, newValue) {
        node.innerHTML = typeof newValue == 'undefined' ? '' : newValue;
    },

    classUpdater: function (node, newValue, oldValue) {
        // 更新className需要在原来的基础上  + ‘ ’ + 新的class
        var className = node.className,
            space;

        className = className.replace(oldValue, '').replace(/\s$/, '');
        space = className && String(newValue) ? ' ' : '';
        node.className = className + space + newValue;
    },

    modelUpdater: function (node, newValue) {
        node.value = typeof newValue == 'undefined' ? '' : newValue;
    }
};
