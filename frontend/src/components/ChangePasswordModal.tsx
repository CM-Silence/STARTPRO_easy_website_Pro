import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/utils/api'

interface PasswordChangeForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onPasswordChanged: () => void
}

export default function ChangePasswordModal({ isOpen, onClose, onPasswordChanged }: ChangePasswordModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<PasswordChangeForm>()

  const newPassword = watch('newPassword', '')

  const validatePassword = (password: string) => {
    const minLength = password.length >= 6
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
    }
  }

  const passwordValidation = validatePassword(newPassword)

  const onSubmit = async (data: PasswordChangeForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('新密码和确认密码不匹配')
      return
    }

    if (!data.currentPassword) {
      toast.error('请输入当前密码')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      }

      const response = await authApi.updateProfile(payload)

      if (response.success) {
        toast.success('密码修改成功')
        reset()
        onPasswordChanged()
        onClose()
      } else {
        toast.error(response.message || '密码修改失败')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '密码修改失败'
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />

        <div className="inline-block align-bottom bg-theme-surface rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-theme-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-theme-text">
                  修改密码
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
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-theme-text mb-1">
                    当前密码
                  </label>
                  <div className="relative">
                    <input
                      {...register('currentPassword', {
                        required: '请输入当前密码'
                      })}
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="theme-input w-full"
                      placeholder="请输入当前密码"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-5 w-5 text-theme-textSecondary hover:text-theme-text" />
                      ) : (
                        <Eye className="h-5 w-5 text-theme-textSecondary hover:text-theme-text" />
                      )}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-theme-text mb-1">
                    新密码
                  </label>
                  <div className="relative">
                    <input
                      {...register('newPassword', {
                        required: '请输入新密码',
                        minLength: { value: 6, message: '密码至少6个字符' }
                      })}
                      type={showNewPassword ? 'text' : 'password'}
                      className="theme-input w-full"
                      placeholder="请输入新密码"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5 text-theme-textSecondary hover:text-theme-text" />
                      ) : (
                        <Eye className="h-5 w-5 text-theme-textSecondary hover:text-theme-text" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                  )}

                  {/* 密码强度指示器 */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center text-xs text-theme-textSecondary mb-1">
                        <Lock className="w-3 h-3 mr-1" />
                        密码强度要求:
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs">
                          {passwordValidation.minLength ? (
                            <Check className="w-3 h-3 text-green-500 mr-1" />
                          ) : (
                            <X className="w-3 h-3 text-red-500 mr-1" />
                          )}
                          <span className={passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}>
                            至少6个字符
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          {passwordValidation.hasUpperCase ? (
                            <Check className="w-3 h-3 text-green-500 mr-1" />
                          ) : (
                            <X className="w-3 h-3 text-red-500 mr-1" />
                          )}
                          <span className={passwordValidation.hasUpperCase ? 'text-green-600' : 'text-red-600'}>
                            包含大写字母
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          {passwordValidation.hasLowerCase ? (
                            <Check className="w-3 h-3 text-green-500 mr-1" />
                          ) : (
                            <X className="w-3 h-3 text-red-500 mr-1" />
                          )}
                          <span className={passwordValidation.hasLowerCase ? 'text-green-600' : 'text-red-600'}>
                            包含小写字母
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          {passwordValidation.hasNumbers ? (
                            <Check className="w-3 h-3 text-green-500 mr-1" />
                          ) : (
                            <X className="w-3 h-3 text-red-500 mr-1" />
                          )}
                          <span className={passwordValidation.hasNumbers ? 'text-green-600' : 'text-red-600'}>
                            包含数字
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          {passwordValidation.hasSpecialChar ? (
                            <Check className="w-3 h-3 text-green-500 mr-1" />
                          ) : (
                            <X className="w-3 h-3 text-red-500 mr-1" />
                          )}
                          <span className={passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}>
                            包含特殊字符
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-theme-text mb-1">
                    确认新密码
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword', {
                        required: '请确认新密码',
                        validate: value => value === newPassword || '密码不匹配'
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="theme-input w-full"
                      placeholder="请再次输入新密码"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-theme-textSecondary hover:text-theme-text" />
                      ) : (
                        <Eye className="h-5 w-5 text-theme-textSecondary hover:text-theme-text" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-theme-surfaceAlt px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tech-accent text-base font-medium text-white hover:bg-tech-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tech-accent sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? '修改中...' : '修改密码'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-theme-divider shadow-sm px-4 py-2 bg-theme-surface text-base font-medium text-theme-text hover:bg-theme-surfaceAlt focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tech-accent sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
