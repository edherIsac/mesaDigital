import axios from 'axios'
import { API_BASE, API_PREFIX } from './config'

const baseURL = `${API_BASE}${API_PREFIX}`

const client = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use(
  (config) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        if (!config.headers) config.headers = {}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      // ignore
    }
    return config
  },
  (error) => Promise.reject(error),
)

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data) return Promise.reject(error.response.data)
    return Promise.reject({ message: error.message || 'Network Error' })
  },
)

export default client
