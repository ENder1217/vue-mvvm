/**
* Vue作为数据绑定的入口，整合Observer、Compile和Watcher三者，
* 1. 通过Observer来监听自己的model数据变化，
* 2. 通过Compile来解析编译模板指令，
* 3. 最终利用Watcher搭起Observer和Compile之间的通信桥梁，
* 4. 达到数据变化 -> 视图更新；视图交互变化(input) -> 数据model变更的双向绑定效果。
*/


/**
 * Vue 构造函数
 *
 * @protected
 * @method
 * @param {Object} options          -实例化Vue需要的所有参数
 * @param {Object} options-data     -数据
 * @param {Object} options-methods  -函数
 * @param {String} options-el       -元素作为Vue实例的挂载目标
 * @returns {Object}
 */
function Vue(options) {
    this.$options = options;
    var data = this._data = this.$options.data,
        keys = Object.keys(data),
        _self = this;

    // Vue实例中，this.data.xx 可以直接通过 this.XX 或者 vm.xx来获取，所以要增加代理，
    // 还是利用数据劫持，在getter阶段， 获取this.xxx 返回this.data.xxx;
    for(var i=0, key; key = keys[i]; i++){
        _self._proxy(key);
    }

    observe(data, this);

    this.$compile = new Compile(options.el || document.body, this)
}

// 主动增加一个订阅
Vue.prototype.$watch = function(exp, cb) {
    new Watcher(this, exp, cb);
};

Vue.prototype._proxy = function(key){
    var _self = this;

    Object.defineProperty(this, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter() {
            return _self._data[key];
        },
        set: function proxySetter(newVal) {
            _self._data[key] = newVal;
        }
    });
};
