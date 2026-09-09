import React, { useCallback, useEffect, useRef, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { authMethodsApi, AuthMethodRow } from '@/utils/api'
import { Check, KeyRound, Lock, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'editor', label: '编辑者' },
  { value: 'viewer', label: '访客' }
]

export default function AdminAuthMethodsPage() {
  const [methods, setMethods] = useState<AuthMethodRow[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('local')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)

  const selected = methods.find((m) => m.key === selectedKey) || null

  const fetchMethods = useCallback(async (preferKey?: string) => {
    try {
      setLoading(true)
      const res = await authMethodsApi.list()
      if (res.success) {
        const list = (res.data || []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
        setMethods(list)
        setSelectedKey((prev) => {
          const target = preferKey || prev
          return list.some((m) => m.key === target) ? target : list[0]?.key || 'local'
        })
      } else {
        toast.error(res.message || '获取登录方法失败')
      }
    } catch {
      toast.error('获取登录方法失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  // 点击外部关闭新增下拉
  useEffect(() => {
    if (!addMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [addMenuOpen])

  const patchSelected = (patch: Partial<AuthMethodRow>) => {
    if (!selected) return
    setMethods((prev) => prev.map((m) => (m.key === selected.key ? { ...m, ...patch } : m)))
  }

  const patchConfig = (patch: Partial<AuthMethodRow['config']>) => {
    if (!selected) return
    setMethods((prev) => prev.map((m) => (m.key === selected.key ? { ...m, config: { ...m.config, ...patch } } : m)))
  }

  const handleAddKeycloak = async () => {
    setAddMenuOpen(false)
    try {
      const res = await authMethodsApi.create({ type: 'keycloak' })
      if (res.success) {
        toast.success('已新增 Keycloak 登录方法，请填写连接配置')
        fetchMethods((res.data as AuthMethodRow)?.key)
      } else {
        toast.error(res.message || '新增失败')
      }
    } catch {
      toast.error('新增失败')
    }
  }

  const handleSave = async () => {
    if (!selected) return
    if (selected.autoCreate && selected.type === 'keycloak' && !selected.autoCreateRole) {
      return toast.error('开启自动创建账号时需选择自动分配的角色组')
    }
    try {
      setSaving(true)
      const res = await authMethodsApi.update(selected.key, {
        displayName: selected.displayName,
        isEnabled: selected.isEnabled,
        sortOrder: selected.sortOrder,
        autoCreate: selected.autoCreate,
        autoCreateRole: selected.autoCreateRole,
        config: selected.type === 'keycloak' ? selected.config : undefined
      })
      if (res.success) {
        toast.success('已保存，立即生效')
      } else {
        toast.error(res.message || '保存失败')
      }
      fetchMethods(selected.key)
    } catch {
      toast.error('保存失败')
      fetchMethods(selected.key)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected || selected.type !== 'keycloak') return
    if (!window.confirm(`确定删除登录方法「${selected.displayName}」吗？已关联的账号不受影响。`)) return
    try {
      const res = await authMethodsApi.delete(selected.key)
      if (res.success) {
        toast.success('登录方法已删除')
        fetchMethods('local')
      } else {
        toast.error(res.message || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-tech-dark text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-tech-accent focus:border-transparent'

  const renderToggle = (checked: boolean, onChange: () => void, disabled = false) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`w-10 h-5 rounded-full relative transition-colors shrink-0 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
  )

  return (
    <AdminLayout title="登录管理" description="管理后台登录方式：启用/停用登录方法，配置 Keycloak 连接，控制是否允许自动创建账号">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-theme-text">登录管理</h1>
          <p className="text-theme-textSecondary">已启用且配置完整的方法会显示在登录页。</p>
        </div>
        <button
          onClick={() => fetchMethods(selectedKey)}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 rounded-md border border-theme-divider text-theme-textSecondary hover:bg-theme-surfaceAlt transition text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />刷新
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* 左侧：登录方法列表 */}
        <div className="w-full lg:w-72 shrink-0 bg-theme-surface border border-theme-divider rounded-xl p-3">
          <div className="space-y-1">
            {methods.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedKey(m.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                  m.key === selectedKey
                    ? 'bg-semantic-hero-accent/20 text-theme-text border border-semantic-hero-accent/50'
                    : 'text-theme-textSecondary hover:text-theme-text hover:bg-theme-surfaceAlt/80 border border-transparent'
                }`}
              >
                <span className="p-1.5 rounded-md bg-theme-surfaceAlt text-theme-textSecondary">
                  {m.type === 'local' ? <Lock className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{m.displayName}</span>
                  <span className="block text-xs text-theme-textSecondary">
                    {m.type === 'local' ? '本地登录' : 'Keycloak'}
                    {!m.isEnabled && ' · 已停用'}
                    {m.isEnabled && m.type === 'keycloak' && !m.configured && ' · 待配置'}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* 新增登录方法（下拉，目前仅 Keycloak） */}
          <div className="relative mt-3" ref={addMenuRef}>
            <button
              onClick={() => setAddMenuOpen((v) => !v)}
              className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg border border-dashed border-theme-divider text-theme-textSecondary hover:text-theme-text hover:border-tech-accent transition text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />新增登录方法
            </button>
            {addMenuOpen && (
              <div className="absolute z-20 bottom-full mb-1 w-full bg-white dark:bg-tech-dark border border-theme-divider rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={handleAddKeycloak}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-theme-text hover:bg-theme-surfaceAlt transition"
                >
                  <KeyRound className="w-4 h-4 text-theme-textSecondary" />
                  <span className="flex-1 text-left">Keycloak</span>
                  <span className="text-xs text-theme-textSecondary">OIDC</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：所选方法配置 */}
        <div className="flex-1 w-full min-w-0">
          {!selected && !loading && (
            <div className="bg-theme-surface border border-theme-divider rounded-xl px-5 py-10 text-center text-sm text-theme-textSecondary">
              请选择左侧的登录方法
            </div>
          )}

          {selected && (
            <div className="bg-theme-surface border border-theme-divider rounded-xl p-5 space-y-5">
              {/* 头部：名称 + 启用开关 + 删除 */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-theme-surfaceAlt text-theme-textSecondary">
                    {selected.type === 'local' ? <Lock className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-theme-text">{selected.displayName}</h3>
                    <p className="text-xs text-theme-textSecondary">
                      {selected.type === 'local' ? '本地账号密码登录（系统保留，不可停用）' : 'Keycloak OIDC 单点登录'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {selected.type === 'keycloak' && (
                    <button
                      onClick={handleDelete}
                      className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="删除此登录方法"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-theme-textSecondary">{selected.isEnabled ? '已启用' : '已停用'}</span>
                    {renderToggle(selected.isEnabled, () => patchSelected({ isEnabled: !selected.isEnabled }), selected.type === 'local')}
                  </div>
                </div>
              </div>

              {/* 基础配置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">登录页显示名</label>
                  <input
                    className={inputCls}
                    value={selected.displayName}
                    onChange={(e) => patchSelected({ displayName: e.target.value })}
                    placeholder="显示在登录页上的名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">登录页排序（越小越靠前）</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    className={inputCls}
                    value={selected.sortOrder}
                    onChange={(e) => patchSelected({ sortOrder: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Keycloak 连接配置 */}
              {selected.type === 'keycloak' && (
                <div className="rounded-lg bg-theme-surfaceAlt/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-theme-text">Keycloak 连接配置</h4>
                    {selected.configured ? (
                      <span className="text-xs text-emerald-600">✓ 配置完整</span>
                    ) : (
                      <span className="text-xs text-amber-600">⚠ 配置不完整，登录页不会显示此方法</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-textSecondary mb-1">Issuer URL</label>
                    <input
                      className={inputCls}
                      value={selected.config.issuer}
                      onChange={(e) => patchConfig({ issuer: e.target.value })}
                      placeholder="例如：https://auth.example.com/realms/my-realm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-theme-textSecondary mb-1">Client ID</label>
                      <input
                        className={inputCls}
                        value={selected.config.clientId}
                        onChange={(e) => patchConfig({ clientId: e.target.value })}
                        placeholder="请到 Keycloak 管理台的客户端页面获取"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-theme-textSecondary mb-1">Client Secret</label>
                      <input
                        type="password"
                        className={inputCls}
                        value={selected.config.clientSecret}
                        onChange={(e) => patchConfig({ clientSecret: e.target.value })}
                        placeholder="Keycloak 客户端凭证页复制"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-theme-textSecondary break-all">
                    回调地址（填入 Keycloak 客户端的 Valid redirect URIs）：<code className="text-theme-text">{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/keycloak/${selected.key}/callback`}</code>
                  </p>
                </div>
              )}

              {/* 创建账号策略 */}
              <div className="rounded-lg bg-theme-surfaceAlt/60 px-4 py-3 space-y-3">
                <div className="flex items-start gap-3">
                  {renderToggle(selected.autoCreate, () => patchSelected({ autoCreate: !selected.autoCreate }))}
                  <span>
                    <span className="text-sm font-medium text-theme-text">
                      {selected.type === 'local' ? '允许创建本地账号' : '登录时自动创建账号'}
                    </span>
                    <span className="block mt-0.5 text-xs text-theme-textSecondary">
                      {selected.type === 'local'
                        ? '开启后，管理员可在「用户管理」页新建/删除账号并分配角色；关闭后仅能查看与修改姓名等资料。'
                        : '开启后，该 Keycloak 用户首次登录会自动创建账号；关闭时仅已登记的账号可登录。'}
                    </span>
                  </span>
                </div>

                {selected.type === 'keycloak' && selected.autoCreate && (
                  <div className="pl-[3.25rem]">
                    <label className="block text-sm font-medium text-theme-textSecondary mb-1">自动分配角色组</label>
                    <select
                      className={`${inputCls} max-w-xs`}
                      value={selected.autoCreateRole || ''}
                      onChange={(e) => patchSelected({ autoCreateRole: (e.target.value || null) as AuthMethodRow['autoCreateRole'] })}
                    >
                      <option value="">请选择角色组</option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-theme-textSecondary">
                      所有通过此方法登录的用户在新建账号时会自动归类到所选角色组；已存在的账号不会被改变角色。
                    </p>
                  </div>
                )}
              </div>

              {/* 保存 */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-tech-accent text-white text-sm hover:bg-tech-accent/90 transition disabled:opacity-60"
                >
                  {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
