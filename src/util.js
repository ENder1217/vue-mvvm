var __toString = Object.prototype.toString,
    __arrayProto = Array.prototype,
    __funcProto = Function.prototype,
    __hasProto = '__proto__' in {};

function isObject(obj) {
    return __toString.call(obj) === '[object Object]';
}

function isArray(obj) {
    return __toString.call(obj) === '[object Array]';
}

function isPlainObject(obj) {
    if(!obj || !isObject(obj) || obj.nodeType || (window===obj)){
        return false;
    }

    if(obj.constructor && !obj.constructor.prototype.hasOwnProperty('isPrototypeOf')){
        return false;
    }

    return true;
}

function isArrayOrObject (obj) {
    return obj !== null && typeof obj === 'object';
}

function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        configurable: true,
        writable: true
    });
}

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function protoAugment(target, src, keys) {
    target.__proto__ = src;
}

function copyAugment(target, src, keys) {
    for(var i=0, key; key = keys[i]; i++){
        def(target, key, src[key]);
    }
}

function dependArray (value) {
    for (var e = (void 0), i = 0, l = value.length; i < l; i++) {
        e = value[i];
        // 如果数组元素也是对象,那么他们observe过程也生成了ob实例,那么就让ob的dep也收集依赖
        e && e.__ob__ && e.__ob__.dep.depend();
        if (isArray(e)) {
            dependArray(e);
        }
    }
}

__funcProto.bind = function() {
    var _args = arguments,
        _object = arguments[0],
        _self = this;

    return function () {
        var _argc = __arrayProto.slice.call(_args, 1);

        __arrayProto.push.apply(_argc, arguments);

        return _self.apply(_object || null, _argc);
    }
};

var uid = 0;    // 给每个生成的Dep都加一个唯一标识

/**
 * watcher的订阅／发布模式
 * @constructor
 */
var Dep = function() {
    this.id = uid++;
    this.subs = [];   // subs维护了一个订阅者数组，数据变动时在setter中触发notify
};

// 增加一个订阅者
Dep.prototype.addSub = function(watcher) {
    this.subs.push(watcher);
};

Dep.prototype.removeSub = function(watcher){
    var index = this.subs.indexOf(watcher);

    if (index != -1) {
        this.subs.splice(index, 1);
    }
};

// 该方法调用了watcher.js里提供的addDep方法，addDep方法又会调用addSub将监听当前数据的watcher加入dep
// 这样就形成了每个data.xx属性都拥有一个订阅者维护在自己的dep
Dep.prototype.depend = function(){
    if(Dep.target) {
        Dep.target.addDep(this);
    }
};

// 通知订阅者，并触发update()的方法更新视图
Dep.prototype.notify = function(){
    var subs = this.subs.slice();

    for(var i=0, sub; sub=subs[i]; i++){
        sub.update();
    }
};

var arrayMethods = Object.create(__arrayProto),
    arrayKeys = Object.keys(arrayMethods);

// 为vue的数组对象添加自定义的数组方法
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(function(method){
    var originalMethod = __arrayProto[method];

    def(arrayMethods, method, function(){
        var args = __arrayProto.slice.call(arguments),
            inserted, result, ob;

        result = originalMethod.apply(this, args);  // this指向当前操作的数组对象
        ob = this.__ob__;   // 拿到当前数组的ob实例


        switch (method){
            case 'push':
            case 'unshift':
                inserted = args;
                break;
            case 'splice':
                // splice函数的第三个参数和之后位置的参数是要填入数组中的新元素
                inserted = args.slice(2);
                break;
        }

        // 如果有新元素添加，先对它们执行observe
        if (inserted) ob.observeArray(inserted);
        // 触发更新事件
        ob.dep.notify();
        return result;
    });
});

// 支持数组上的arr[index] = xxx(不能完美继承)
def(arrayMethods, '$set', function(index, val){
    if(index > this.length){
        this.length = Number(index) + 1;
    }

    return this.splice(index, 1, val)[0];
});

// 支持数组上删除
def(arrayMethods, '$remove', function(item){
    if(!this.length) return;
    var index = this.indexOf(item);

    if (index > -1) {
        return this.splice(index, 1);
    }
});