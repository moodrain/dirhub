import Vue from 'vue'
import axios from 'axios'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import path from 'path'
import util from './components/utils/util'

import App from './App'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

Vue.use(ElementUI)

Vue.prototype.$pa = path
Vue.prototype.$u = util

/* eslint-disable no-new */
new Vue({
    components: { App },
    template: '<App/>'
}).$mount('#app')