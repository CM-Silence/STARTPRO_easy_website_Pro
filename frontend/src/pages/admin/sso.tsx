import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { motion } from 'framer-motion'

// Keycloak SSO 中转页：用一次性 code 换取本地会话后跳转后台
// 错误码 → 用户提示文案
const SSO_ERROR_MESSAGES: Record<string, string> = {
  access_denied: '单点登录被取消或拒绝',
  state_mismatch: '登录状态校验失败，请重新发起登录',
  token_exchange_failed: '单点登录凭证交换失败，请稍后重试',
  method_disabled: '该登录方式已被停用，请使用其他方式登录',
  not_registered: '该账号尚未登记，请联系管理员开通'
}

export default function AdminSsoCallback() {
  const router = useRouter()
  const [message, setMessage] = useState('正在完成登录...')
  const exchangedRef = useRef(false) // 防止 React StrictMode 下 effect 双执行重复消费一次性 code

  useEffect(() => {
    if (!router.isReady) return

    const error = router.query.error as string | undefined
    const code = router.query.code as string | undefined

    if (error) {
      setMessage(SSO_ERROR_MESSAGES[error] || '单点登录失败，请重试')
      const timer = setTimeout(() => router.replace('/admin/login'), 1500)
      return () => clearTimeout(timer)
    }

    if (code && !exchangedRef.current) {
      exchangedRef.current = true

      const exchange = async () => {
        try {
          const { authApi, setAccessToken } = await import('@/utils/api')
          const res = await authApi.ssoExchange(code)
          const token = (res as any)?.data?.token
          if (!res.success || !token) {
            throw new Error(res.message || '登录失败')
          }
          setAccessToken(token)
          router.replace('/admin/dashboard')
        } catch {
          setMessage('登录会话已失效，请重新发起登录')
          const timer = setTimeout(() => router.replace('/admin/login'), 1500)
          return () => clearTimeout(timer)
        }
      }

      exchange()
    } else if (!code && !error) {
      router.replace('/admin/login')
    }
  }, [router.isReady, router.query.code, router.query.error, router])

  return (
    <>
      <Head>
        <title>单点登录中 - 后台管理系统</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="min-h-screen bg-tech-dark flex items-center justify-center py-12 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-tech-dark via-tech-darker to-tech-dark"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center"
        >
          <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-gray-200 border-t-tech-accent animate-spin"></div>
          <p className="text-gray-700 font-medium">{message}</p>
        </motion.div>
      </div>
    </>
  )
}
