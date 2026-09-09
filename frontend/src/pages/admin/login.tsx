import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Eye, EyeOff, Lock, User, LogIn, KeyRound, ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authApi, setAccessToken, clearAccessToken } from '@/utils/api'
import { useSettings } from '@/contexts/SettingsContext'
import type { LoginForm } from '@/types'

interface LoginMethod {
  key: string
  type: 'local' | 'keycloak'
  displayName: string
}

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false)
  const [showLocalForm, setShowLocalForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [methods, setMethods] = useState<LoginMethod[]>([])
  const { settings } = useSettings()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>()

  // 登录方式展示规则
  const isOnlyLocal = methods.length === 1 && methods[0].type === 'local' // 仅本地：直接显示表单
  const showMethodPicker = methods.length > 1 // 多种方式：先显示各登录方式按钮
  // 多种方式：点击本地后才显示表单
  const showLocalFormArea = isOnlyLocal || (showMethodPicker && showLocalForm)

  // 检查是否已登录
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const refreshed = await authApi.refresh()
        const token = (refreshed as any)?.data?.token
        if (!token) return
        setAccessToken(token)
        const profile = await authApi.getProfile()
        if (profile.success) {
          router.push('/admin/dashboard')
        }
      } catch {
        clearAccessToken()
      }
    }

    checkExistingAuth()
  }, [router])

  // 已启用的登录方法（登录管理页控制）
  useEffect(() => {
    authApi
      .getMethods()
      .then((res: any) => setMethods(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setMethods([]))
  }, [])

  // SSO 降级提示（由后端重定向带回）
  useEffect(() => {
    if (!router.isReady) return
    const sso = router.query.sso as string | undefined
    if (sso === 'disabled') {
      toast.error('该登录方式未启用，请使用其他方式登录')
    } else if (sso === 'unavailable') {
      toast.error('单点登录暂不可用，请使用其他方式登录')
    }
  }, [router.isReady, router.query.sso])

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)

    try {
      const response = await authApi.login(data)

      if (response.success) {
        setAccessToken(response.data.token)

        toast.success('登录成功！')

        // 添加小延迟确保状态更新
        setTimeout(() => {
          router.push('/admin/dashboard')
        }, 100)
      } else {
        toast.error(response.message || '登录失败')
      }
    } catch (error: any) {
      console.error('登录错误:', error)
      // 更详细的错误信息
      const errorMessage = error.response?.data?.message || error.message || '登录失败，请稍后重试'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const startSsoLogin = (methodKey: string) => {
    // 整页跳转发起 OIDC 授权码流程
    window.location.href = `/api/auth/keycloak/start/${methodKey}`
  }

  return (
    <>
      <Head>
        <title>管理员登录 - 后台管理系统</title>
        <meta name="description" content="后台管理系统登录页面" />
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="min-h-screen bg-tech-dark flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        {/* 背景效果 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-tech-dark via-tech-darker to-tech-dark"></div>
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          ></div>
          
          {/* 浮动粒子 */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-tech-accent rounded-full opacity-30 animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-tech-secondary rounded-full opacity-40 animate-float delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-tech-accent rounded-full opacity-20 animate-float delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-md w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-2xl p-8"
          >
            {/* 顶部：企业 Logo（圆角容器）+ 公司名称 */}
            <div className="text-center mb-8">
              {settings?.site_logo ? (
                <div className="mx-auto w-16 h-16 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center p-2 mb-4">
                  <img
                    src={settings.site_logo}
                    alt={settings.site_name || '公司 Logo'}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-tech-accent to-tech-secondary rounded-xl flex items-center justify-center mb-4">
                  <Lock className="h-8 w-8 text-white" />
                </div>
              )}

              <h2 className="text-3xl font-bold text-gray-900">
                {settings?.site_name || '后台管理系统'}
              </h2>
            </div>

            {/* 账号密码表单（仅本地登录时直接显示；多种方式时点击本地按钮后显示） */}
            {showLocalFormArea && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 用户名输入 */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('username', { 
                      required: '请输入用户名',
                      minLength: { value: 3, message: '用户名至少3个字符' }
                    })}
                    type="text"
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-tech-accent focus:border-transparent"
                    placeholder="请输入用户名"
                    autoComplete="username"
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* 密码输入 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password', { 
                      required: '请输入密码',
                      minLength: { value: 6, message: '密码至少6个字符' }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-tech-accent focus:border-transparent"
                    placeholder="请输入密码"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-900 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-900 transition-colors" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* 登录按钮 */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>登录中...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>登录</span>
                  </>
                )}
              </motion.button>
            </form>
            )}

            {/* 多种登录方式时：从本地表单返回方式选择 */}
            {showMethodPicker && showLocalForm && (
              <button
                type="button"
                onClick={() => setShowLocalForm(false)}
                className="w-full mt-8 inline-flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />返回选择登录方式
              </button>
            )}

            {/* 多种登录方式时：登录方式按钮列表（初始显示；点本地后隐藏） */}
            {showMethodPicker && !showLocalForm && (
              <div className="space-y-3">
                {methods.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => (m.type === 'local' ? setShowLocalForm(true) : startSsoLogin(m.key))}
                    className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-tech-accent transition-colors focus:outline-none focus:ring-2 focus:ring-tech-accent focus:border-transparent"
                  >
                    {m.type === 'local' ? (
                      <Lock className="h-5 w-5" />
                    ) : (
                      <KeyRound className="h-5 w-5" />
                    )}
                    <span>{m.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* 版权信息：固定在页面底部，单行展示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="fixed bottom-4 inset-x-0 text-center text-sm text-gray-500 px-4"
          >
            <p>
              {settings?.site_statement ? settings.site_statement : `© ${settings?.site_name || ''}`}
              {settings?.icp_number ? (
                <>
                  {"  |  "}
                  {settings?.icp_link ? (
                    <a
                      href={settings.icp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-300 transition-colors"
                    >
                      {settings.icp_number}
                    </a>
                  ) : (
                    settings.icp_number
                  )}
                </>
              ) : null}
            </p>
          </motion.div>
        </div>
      </div>
    </>
  )
}
