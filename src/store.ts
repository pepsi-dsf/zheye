import { createStore, Commit } from 'vuex'
import axios, { AxiosRequestConfig } from 'axios'
import { arrToObj, objToArr } from './helper'
export interface ResponseType<P = Record<string, unknown>> {
  code: number
  msg: string
  data: P
}
export interface ImageProps {
  _id?: string
  url?: string
  createdAt?: string
  fitUrl?: string
}
export interface UserProps {
  isLogin: boolean
  nickName?: string
  _id?: string
  column?: string
  email?: string
  avatar?: ImageProps
  description?: string
}

export interface ColumnProps {
  _id: string
  title: string
  avatar?: ImageProps
  description: string
}
export interface PostProps {
  _id?: string
  title: string
  excerpt?: string
  content?: string
  image?: ImageProps | string
  createdAt?: string
  column: string
  author?: string | UserProps
}
export interface GlobalErrorProps {
  status: boolean
  message?: string
}
interface ListProps<P> {
  [id: string]: P
}
export interface GlobalDataProps {
  token: string
  error: GlobalErrorProps
  loading: boolean
  columns: { data: ListProps<ColumnProps>; currentPage: number; total: number }
  posts: { data: ListProps<PostProps>; loadedColumns: string[] }
  user: UserProps
}
const getAndCommit = async (
  url: string,
  mutationName: string,
  commit: Commit
) => {
  const { data } = await axios.get(url)
  commit(mutationName, data)
  return data
}
const postAndCommit = async (
  url: string,
  mutationName: string,
  commit: Commit,
  payload: any
) => {
  const { data } = await axios.post(url, payload)
  commit(mutationName, data)
  return data
}
const asyncAndCommit = async (
  url: string,
  mutationName: string,
  commit: Commit,
  config: AxiosRequestConfig = { method: 'get' },
  extraData?: any
) => {
  const { data } = await axios(url, config)
  if (extraData) {
    commit(mutationName, { data, extraData })
  } else {
    commit(mutationName, data)
  }
  return data
}
const store = createStore<GlobalDataProps>({
  state: {
    token: localStorage.getItem('token') || '',
    error: { status: false },
    loading: false,
    columns: { data: {}, currentPage: 0, total: 0 },
    posts: { data: {}, loadedColumns: [] },
    user: { isLogin: false }
  },
  mutations: {
    // login(state) {
    //   state.user = { ...state.user, isLogin: true, name: 'viking' }
    // },
    createPost (state, newPost) {
      // state.posts.push(newPost) 已经从数组变为对象
      state.posts.data[newPost._id] = newPost
    },
    fetchColumns (state, rawData) {
      // state.columns = rawData.data.list
      const { data } = state.columns
      const { list, count, currentPage } = rawData.data
      state.columns = {
        data: { ...data, ...arrToObj(list) },
        total: count,
        currentPage: currentPage * 1
      }
    },
    fetchColumn (state, rawData) {
      // state.columns = [rawData.data]
      state.columns.data[rawData.data._id] = rawData.data
    },
    fetchPosts (state, { data: rawData, extraData: columnId }) {
      // state.posts = rawData.data.list
      // state.posts.data = arrToObj(rawData.data.list)是直接替换而不是添加，所以只会有最后点开的那个专栏
      state.posts.data = { ...state.posts.data, ...arrToObj(rawData.data.list) }
      state.posts.loadedColumns.push(columnId)
    },
    fetchPost (state, rawData) {
      // state.posts = [rawData.data]
      state.posts.data[rawData.data._id] = rawData.data
    },
    deletePost (statem, { data }) {
      // statem.posts = state.posts.filter(post=>post._id!==data._id)
      delete statem.posts.data[data._id]
    },
    updatePost (state, { data }) {
      // 这里我们是在 map 整个 posts 啊，是一个 posts 的列表， 除了传入的 data的那个 post，其他都是不相等的，要一摸一样的返回
      // state.posts = state.posts.map(post => {
      //   if (post._id === data._id) {
      //     return data
      //   } else {
      //     return post
      //   }
      // })
      state.posts.data[data._id] = data
    },
    setLoading (state, status) {
      state.loading = status
    },
    setError (state, e: GlobalErrorProps) {
      state.error = e
    },
    fetchCurrentUser (state, rawData) {
      state.user = { isLogin: true, ...rawData.data }
    },
    login (state, rawData) {
      const { token } = rawData.data
      state.token = token
      localStorage.setItem('token', token)
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
    },
    logout (state) {
      state.token = ''
      localStorage.removeItem('token')
      delete axios.defaults.headers.common.Authorization
      state.user.isLogin = false
    }
  },
  actions: {
    fetchColumns ({ state, commit }, params = {}) {
      const { currentPage = 1, pageSize = 6 } = params
      if (state.columns.currentPage < currentPage) {
        return asyncAndCommit(
          `/columns?currentPage=${currentPage}&pageSize=${pageSize}`,
          'fetchColumns',
          commit
        )
      }
    },
    fetchColumn ({ state, commit }, cid) {
      if (!state.columns.data[cid]) {
        return getAndCommit(`/columns/${cid}`, 'fetchColumn', commit)
      }
    },
    fetchPosts ({ state, commit }, cid) {
      // return getAndCommit(`/columns/${cid}/posts`, 'fetchPosts', commit)
      if (!state.posts.loadedColumns.includes(cid)) {
        return asyncAndCommit(
          `/columns/${cid}/posts`,
          'fetchPosts',
          commit,
          { method: 'get' },
          cid
        )
      }
    },
    fetchPost ({ state, commit }, id) {
      const currentPost = state.posts.data[id]
      if (!currentPost || !currentPost.content) {
        return getAndCommit(`/posts/${id}`, 'fetchPost', commit)
      } else {
        // 编辑文章时，因为已经跳过了返回，所以根本不会有promise，就没法then 所以人工返回一个
        return Promise.resolve({ data: currentPost })
      }
    },
    updatePost ({ commit }, { id, payload }) {
      return asyncAndCommit(`/posts/${id}`, 'updatePost', commit, {
        method: 'patch',
        data: payload
      })
    },
    fetchCurrentUser ({ commit }) {
      return getAndCommit('/user/current', 'fetchCurrentUser', commit)
    },
    login ({ commit }, payload) {
      return postAndCommit('/user/login', 'login', commit, payload)
    },
    createPost ({ commit }, payload) {
      return postAndCommit('/posts', 'createPost', commit, payload)
    },
    deletePost ({ commit }, id) {
      return asyncAndCommit(`/posts/${id}`, 'deletePost', commit, {
        method: 'delete'
      })
    },
    loginAndFetch ({ dispatch }, loginData) {
      return dispatch('login', loginData).then(() => {
        return dispatch('fetchCurrentUser')
      })
    }
  },
  getters: {
    getColumns: state => {
      return objToArr(state.columns.data)
    },
    getColumnById: state => (id: string) => {
      // return state.columns.find(c => c._id === id)
      return state.columns.data[id]
    },
    getPostsByCid: state => (cid: string) => {
      // return state.posts.filter(post => post.column === cid)
      return objToArr(state.posts.data).filter(post => post.column === cid)
    },
    getCurrentPost: state => (id: string) => {
      // return state.posts.find(post => post._id === id)
      return state.posts.data[id]
    }
  }
})

export default store
