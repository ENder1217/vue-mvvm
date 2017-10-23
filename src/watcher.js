/**
* Watcher订阅者作为Observer和Compile的桥梁，主要做的事件是：
* 1. 自身实例化的时候，往订阅器（Dep）中添加自己，
* 2. 自身有一个update()方法
* 3. 当属性发生改变，调用Dep.notify()发布事件，Watcher调用自身的update方法，并触发compile中绑定的回调
*
*/

/**
 * Watcher 构造函数
 *
 * @protected
 * @method
 * @param {Object} vm  -当前Vue实例
 * @param {Object} exp -绑定的vue实例data.xx 属性
 * @param {void}   cb  -在compile实例化Watcher，当绑定的属性发生改变时，触发的回调
 * @returns {Object}
 */
function Watcher(vm, exp, cb) {
    this.cb = cb;
    this.vm = vm;
    this.exp = exp;
    this.depIds = {};
    // 实例化的时候，获取当前exp对应的值，在get()的时候，也会触发getter的钩子，就把Watcher增加到Dep的订阅队列里了
    this.value = this.get();
}

Watcher.prototype.update = function(){
    this.run();
};

Watcher.prototype.run = function(){
    //获取最新的数据
    var newValue = this.get(),
        oldValue = this.value;    // watcher实例化时的value

    if (newValue !== oldValue || isArrayOrObject(newValue)) {
        this.value = newValue;
        this.cb.call(this.vm, newValue, oldValue);
    }
};

Watcher.prototype.addDep = function(dep){
    // 如果该watcher已经收集进了当前属性的依赖就不再进行收集
    if (!this.depIds.hasOwnProperty(dep.id)) {
        dep.addSub(this);
        this.depIds[dep.id] = dep;
    }
};

Watcher.prototype.get = function(){
    // 获取属性值，同时也会触发具体属性值 getter上的钩子，这里的Dep是类，没有实例化的。
    // 以{{a+b}}这个差值为例，在DOM里最终会被"a+b"表达式的真实值所取代
    // 所以存在一个求出这个“a+b”的表达式的过程，求值的过程就会自然的分别触发a和b的getter
    // 而在getter中，我们看到执行了dep.depend()，这个函数实际上会执行dep.addSub(Dep.target)
    // 即在dep的订阅者数组中存放了Dep.target，让Dep.target订阅dep
    // Dep.target指的就是这里的watcher
    Dep.target = this;
    var value = this.getVMValue();
    Dep.target = null;
    return value;
};

Watcher.prototype.getVMValue = function(){
    var exp = this.exp.split('.'),  // data.obj.name ==> [data, obj, name]
        value = this.vm._data;

    exp.forEach(function(k) {
        value = value[k];  // 这一步，就会真正的触发 getter上的钩子进行watcher的订阅
    });
    return value;
};
