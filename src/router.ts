import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'
import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Signup from './views/Signup.vue'
import ColumnDetail from './views/ColumnDetail.vue'
import CreatePost from './views/CreatePost.vue'
import PostDetail from './views/PostDetail.vue'
import store from './store'
const routerHistory = createWebHistory()
const router = createRouter({
  history: routerHistory,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: {
        redirectAlreadyLogin: true
      }
    },
    {
      path: '/signup',
      name: 'signup',
      component: Signup,
      meta: { redirectAlreadyLogin: true }
    },
    {
      path: '/create',
      name: 'create',
      component: CreatePost,
      meta: {
        requiredLogin: true
      }
    },
    {
      path: '/column/:id',
      name: 'column',
      component: ColumnDetail
    },
    {
      path: '/posts/:id',
      name: 'post',
      component: PostDetail
    }
  ]
})
router.beforeEach((to, from, next) => {
  const { user, token } = store.state
  const { requiredLogin, redirectAlreadyLogin } = to.meta
  if (!user.isLogin) {
    // 没有登陆
    if (token) {
      // 有token
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      store
        .dispatch('fetchCurrentUser')
        .then(() => {
          // 拿到了用户信息
          if (redirectAlreadyLogin) {
            next('/')
          } else {
            next()
          }
        })
        .catch(e => {
          // token过期
          console.error(e)
          // localStorage.removeItem('token')
          store.commit('logout')
          next('login')
        })
    } else {
      // 没有token
      if (requiredLogin) {
        // 需要登陆
        next('login')
      } else {
        // 不需要登录
        next()
      }
    }
  } else {
    // 已经登陆
    if (redirectAlreadyLogin) {
      // 已登录不能访问
      next('/')
    } else {
      next()
    }
  }
})
export default router
