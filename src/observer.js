/**
 * (使用Object.defineProperty转化为getter与setter,)
 * 这个文件主要完成，把一个对象的属性，在getter、setter阶段增加数据劫持
 * 尤其是在setter阶段处理一些视图更新、双向绑定的情况
 * 在数据和视图发生变化用到了发布/订阅模式
 *
 */

var defineReactive = function (obj, key, val) {
    // 在每个属性上都实例化一个dep用来保存该属性私有的订阅者,这个实例会被闭包到getter和setter中
    // 对属性的值继续执行observe,如果属性的值是一个对象,那么则又递归进去对他的属性执行defineReactive
    // 保证遍历到所有层次的属性
    var dep = new Dep(),
        childOb = observe(val);

    Object.defineProperty(obj, key, {
        enumerable: true,   // 可枚举
        configurable: true,    // 可配置
        get: function () {
            // 由于每一个属性都实例化了一个私有的dep，所以只能通过在Dep类定义一个全局属性来暂存watcher, 每次添加完成后移除
            // 只有在有Dep.target时才说明是Vue内部依赖收集过程触发的getter
            // 那么这个时候就需要执行dep.depend(),将watcher(Dep.target的实际值)添加到dep的subs数组中
            // 对于其他时候,比如dom事件回调函数中访问这个变量导致触发的getter并不需要执行依赖收集,直接返回value即可
            if (Dep.target) {
                dep.depend();
                if(childOb){
                    // 如果value在observe过程中生成了ob实例,那么就让ob的dep也收集依赖
                    childOb.dep.depend();
                    if (isArray(val)) {
                        // 如果数组元素也是对象,那么他们observe过程也生成了ob实例,那么就让ob的dep也收集依赖
                        dependArray(val);
                    }
                }
            }
            return val;
        },

        set: function (newVal) {
            if (newVal === val) {
                return;
            }
            val = newVal;
            // observe这个新set的值
            observe(val);
            // 通知订阅者watchers，数据发生改变了
            dep.notify();
        }
    });
};

/**
 * 暴露 observer方法，返回Observer实例
 *
 * @protected
 * @method
 * @param {Object} value  -要转换的数据对象
 * @returns {Object}
 */

function observe(value) {
    if (!isArrayOrObject(value)) {
        return;
    }
    // 如果该数据已经进行过observe则直接返回
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        return value.__ob__;
    } else if (isArray(value) || isObject(value)){
        return new Observer(value);
    }
}


/**
 * Observer的构造函数
 *
 * @protected
 * @method
 * @param {Object} value  -要转换的数据对象
 * @returns {void}
 */
function Observer (value){
    this.value = value;
    // getter和setter存在的缺陷：只能监听到属性的更改，不能监听到属性的删除与添加
    // Vue的解决办法是为所有的对象和数组(只有这俩哥们才可能delete和新建属性)，也创建一个dep完成收集依赖的过程
    // 添加与删除操作都是通过找到dep然后执行notify
    this.dep = new Dep();
    // 给添加过的数据添加标识
    def(value, '__ob__', this);
    // 如果是数组对象则绑定vue特定的变异方法
    if(isArray(value)){
        var augment = __hasProto ? protoAugment : copyAugment;

        augment(value, arrayMethods, arrayKeys);
        this.observeArray(value);
    }else {
        // 如果是对象则使用walk遍历每个属性
        this.walk(value);
    }
}

Observer.prototype.walk = function(value){
    var keys = Object.keys(value);

    for(var i=0, key; key = keys[i]; i++){
        defineReactive(value, key, value[key]);
    }
};

Observer.prototype.observeArray = function (items) {
    for (var i = 0, item; item = items[i]; i++) {
        observe(item);
    }
};
