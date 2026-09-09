import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Mail, Globe, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/utils/api'

interface UserProfileForm {
  // 个人资料字段
  email: string
  firstName: string
  lastName: string

  // 语言设置
  language: string
}

interface UserProfileModalProps {
  isOpen: boolean
  user: any
  onClose: () => void
  onProfileUpdated: () => Promise<void> | void
}

export default function UserProfileModal({ isOpen, user, onClose, onProfileUpdated }: UserProfileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<UserProfileForm>({
    defaultValues: {
      email: user?.email || '',
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
      language: user?.language || 'zh-CN'
    }
  })

  useEffect(() => {
    if (user) {
      reset({
        email: user.email || '',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        language: user.language || 'zh-CN'
      })
    }
  }, [user, reset])

  const onSubmit = async (data: UserProfileForm) => {
    setIsSubmitting(true)
    try {
      const email = (data.email || '').trim()

      // 后端仅允许 email 更新，其余字段不参与提交以避免校验失败
      const updateData: any = {}
      if (email) updateData.email = email

      const response = await authApi.updateProfile(updateData)

      if (response.success) {
        toast.success('资料更新成功')
        await Promise.resolve(onProfileUpdated())
        onClose()
      } else {
        toast.error(response.message || '资料更新失败')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '资料更新失败'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeModal = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1300] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />

        <div className="inline-block align-bottom bg-white border border-gray-200 rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-theme-text">
                  个人资料
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-theme-textSecondary hover:text-theme-text"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg text-white select-none" style={{ backgroundColor: 'var(--color-accent)' }}>
                    {(([user?.last_name, user?.first_name].filter(Boolean).join('')) || user?.username || '').charAt(0).toUpperCase() || ''}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-theme-text">
                      {([user?.last_name, user?.first_name].filter(Boolean).join('')) || user?.username || ''}
                    </p>
                    <p className="text-sm text-theme-textSecondary">
                      {user?.role}
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-theme-text mb-1">
                    邮箱地址
                  </label>
                  <div className="relative">
                    <input
                      {...register('email', {
                        required: '请输入邮箱地址',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: '请输入有效的邮箱地址'
                        }
                      })}
                      type="email"
                      className="theme-input w-full px-3 py-2"
                      placeholder="请输入邮箱地址"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-textSecondary" />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-theme-text mb-1">
                      名字（不可修改）
                    </label>
                    <input
                      {...register('firstName')}
                      type="text"
                      disabled
                      className="theme-input w-full px-3 py-2 opacity-60 cursor-not-allowed"
                      placeholder="名字"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-theme-text mb-1">
                      姓氏（不可修改）
                    </label>
                    <input
                      {...register('lastName')}
                      type="text"
                      disabled
                      className="theme-input w-full px-3 py-2 opacity-60 cursor-not-allowed"
                      placeholder="姓氏"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-theme-text mb-1">
                    语言偏好
                  </label>
                  <div className="relative">
                    <select
                      {...register('language')}
                      className="theme-input w-full px-3 py-2 appearance-none"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en">English</option>
                    </select>
                    <Globe className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-textSecondary pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tech-accent text-base font-medium text-white hover:bg-tech-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tech-accent sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存更改'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-200 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tech-accent sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
