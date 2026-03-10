import axios, { AxiosHeaders } from 'axios'
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
      const url = config.url ?? ''

      // Normalize the request path (works with relative and absolute URLs)
      let path = url
      try {
        const parsed = new URL(url, baseURL)
        path = parsed.pathname
      } catch {
        if (!path.startsWith('/')) path = `/${path}`
      }

      // Public auth routes (don't add Authorization)
      const isAuthRoute = /^\/auth\/(login|register|refresh|forgot-password|reset-password)(?:$|[/?#])/i.test(
        path,
      )

      const invalidToken = !token || token === 'undefined' || token === 'null'

      if (isAuthRoute || invalidToken) {
        if (config.headers instanceof AxiosHeaders) {
          config.headers.delete('Authorization')
        } else if (config.headers) {
          delete (config.headers as Record<string, string>)['Authorization']
        }
        return config
      }

      if (!config.headers) config.headers = new AxiosHeaders()

      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${token}`)
      } else {
        ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
      }
    } catch {
      // ignore errors from localStorage or URL parsing
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
