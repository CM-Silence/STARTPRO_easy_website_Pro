import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { usersApi, AdminUserRow, UserActivityRow } from '@/utils/api'
import { Pencil, History, Check, X, ChevronLeft, ChevronRight, Search, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

const ROLE_BADGES: Record<string, { label: string; cls: string }> = {
  admin: { label: '管理员', cls: 'bg-red-100 text-red-700' },
  editor: { label: '编辑者', cls: 'bg-blue-100 text-blue-700' },
  viewer: { label: '访客', cls: 'bg-gray-100 text-gray-600' }
}

const fmtDate = (value: string | null) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN', { hour12: false })
}

const emptyForm = (): { firstName: string; lastName: string; language: string; email: string; role: string } => ({
  firstName: '',
  lastName: '',
  language: 'zh-CN',
  email: '',
  role: 'editor'
})

const emptyCreateForm = (): { username: string; email: string; password: string; role: string; firstName: string; lastName: string } => ({
  username: '',
  email: '',
  password: '',
  role: 'editor',
  firstName: '',
  lastName: ''
})

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [meta, setMeta] = useState({ current_page: 1, total: 0, total_pages: 1 })
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // 编辑弹窗
  const [editing, setEditing] = useState<AdminUserRow | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  // 新建弹窗
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm())

  // 活动日志弹窗
  const [activityUser, setActivityUser] = useState<AdminUserRow | null>(null)
  const [activityLogs, setActivityLogs] = useState<UserActivityRow[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await usersApi.list({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined
      })
      if (res.success) {
        setUsers(res.data || [])
        setCanManage(Boolean(res.canManage))
        if (res.meta) setMeta({ current_page: res.meta.current_page, total: res.meta.total, total_pages: res.meta.total_pages })
      } else {
        toast.error(res.message || '获取用户列表失败')
      }
    } catch {
      toast.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openEdit = (row: AdminUserRow) => {
    setEditing(row)
    setForm({
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      language: row.language || 'zh-CN',
      email: row.email || '',
      role: row.role
    })
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      setSaving(true)
      const payload: Record<string, string> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        language: form.language.trim() || 'zh-CN'
      }
      // 账号字段仅在本地管理开启时提交
      if (canManage) {
        payload.email = form.email.trim()
        payload.role = form.role
      }
      const res = await usersApi.update(editing.id, payload)
      if (res.success) {
        toast.success('用户更新成功')
        setEditing(null)
        fetchUsers()
      } else {
        toast.error(res.message || '保存失败')
      }
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    const { username, email, password, role, firstName, lastName } = createForm
    if (!username.trim() || !email.trim() || !password) {
      return toast.error('用户名、邮箱、密码为必填项')
    }
    if (password.length < 6) {
      return toast.error('密码至少 6 个字符')
    }
    try {
      setSaving(true)
      const res = await usersApi.create({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined
      })
      if (res.success) {
        toast.success('用户创建成功')
        setCreateOpen(false)
        setCreateForm(emptyCreateForm())
        setPage(1)
        fetchUsers()
      } else {
        toast.error(res.message || '创建失败')
      }
    } catch {
      toast.error('创建失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: AdminUserRow) => {
    if (!window.confirm(`确定删除用户「${row.username}」吗？其登录凭证将被注销，历史操作日志保留。`)) return
    try {
      const res = await usersApi.delete(row.id)
      if (res.success) {
        toast.success('用户删除成功')
        fetchUsers()
      } else {
        toast.error(res.message || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const openActivity = async (row: AdminUserRow) => {
    setActivityUser(row)
    setActivityLogs([])
    try {
      setActivityLoading(true)
      const res = await usersApi.activity(row.id, { limit: 50 })
      if (res.success) setActivityLogs(res.data || [])
      else toast.error(res.message || '获取活动日志失败')
    } catch {
      toast.error('获取活动日志失败')
    } finally {
      setActivityLoading(false)
    }
  }

  const handleSearchSubmit = () => {
    setPage(1)
    fetchUsers()
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-tech-dark text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-tech-accent focus:border-transparent'

  return (
    <AdminLayout title="用户管理" description="账号增删与角色分配能力由「登录管理」页的本地登录-创建账号开关控制">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-theme-text">用户管理</h1>
          <p className="text-theme-textSecondary">
            {canManage ? '本地账号管理已开启：可新建/删除账号并分配角色。' : '本地账号管理已关闭：仅可查看与编辑姓名等资料，可在「登录管理」页开启。'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              placeholder="搜索用户名或邮箱"
              className={`${inputCls} pl-9 w-56`}
            />
          </div>
          <button onClick={handleSearchSubmit} className="px-4 py-2 rounded-lg bg-tech-accent text-white text-sm hover:bg-tech-accent/90 transition">
            搜索
          </button>
          {canManage && (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--semantic-cta-primary-bg)] text-[color:var(--semantic-cta-primary-contrast)] shadow hover:opacity-90 transition text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />新建用户
            </button>
          )}
        </div>
      </div>

      <div className="bg-theme-surface border border-theme-divider rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-theme-divider">
          <thead className="bg-theme-surfaceAlt/60">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">用户名</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">邮箱</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">姓名</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">角色</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">来源</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">最后登录</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-divider">
            {users.map((row) => (
              <tr key={row.id} className="hover:bg-theme-surfaceAlt/40">
                <td className="px-5 py-3 text-sm font-medium text-theme-text">{row.username}</td>
                <td className="px-5 py-3 text-sm text-theme-textSecondary">{row.email || '—'}</td>
                <td className="px-5 py-3 text-sm text-theme-text">
                  {[row.last_name, row.first_name].filter(Boolean).join('') || '—'}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs ${ROLE_BADGES[row.role]?.cls || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_BADGES[row.role]?.label || row.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {row.auth_provider === 'keycloak' ? (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">Keycloak</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">本地</span>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-theme-textSecondary">{fmtDate(row.last_login)}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(row)} className="p-1.5 rounded-md text-gray-500 hover:text-tech-accent hover:bg-theme-surfaceAlt" title="编辑">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => openActivity(row)} className="p-1.5 ml-1 rounded-md text-gray-500 hover:text-tech-accent hover:bg-theme-surfaceAlt" title="活动记录">
                    <History className="w-4 h-4" />
                  </button>
                  {canManage && (
                    <button onClick={() => handleDelete(row)} className="p-1.5 ml-1 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-50" title="删除用户">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-theme-textSecondary">暂无用户</td></tr>
            )}
            {loading && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-theme-textSecondary">加载中...</td></tr>
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {meta.total_pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-theme-divider">
            <span className="text-xs text-theme-textSecondary">
              共 {meta.total} 个用户 · 第 {meta.current_page} / {meta.total_pages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.current_page || meta.current_page <= 1}
                className="p-1.5 rounded-md text-theme-textSecondary hover:bg-theme-surfaceAlt disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                disabled={!meta.total_pages || meta.current_page >= meta.total_pages}
                className="p-1.5 rounded-md text-theme-textSecondary hover:bg-theme-surfaceAlt disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setEditing(null)}>
          <div className="bg-white dark:bg-tech-dark w-full max-w-md rounded-xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">编辑用户</h3>
              <button onClick={() => !saving && setEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              用户名：{editing.username}
              {editing.auth_provider === 'keycloak' && ' · 来源：Keycloak'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">姓</label>
                <input className={inputCls} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="例如：张" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名</label>
                <input className={inputCls} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="例如：三" />
              </div>
            </div>
            {canManage && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
                  <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
                  <p className="mt-1 text-xs text-gray-400">Keycloak 登录按邮箱认领账号，修改邮箱会影响其 SSO 登录归属。</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色</label>
                  <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="admin">管理员</option>
                    <option value="editor">编辑者</option>
                    <option value="viewer">访客</option>
                  </select>
                  {editing.auth_provider === 'keycloak' && (
                    <p className="mt-1 text-xs text-amber-500">该账号来自 Keycloak：若对应登录方法开启了「自动创建账号」，下次 SSO 登录会把角色重置为该方法的角色。</p>
                  )}
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">界面语言</label>
              <select className={inputCls} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="zh-CN">中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => !saving && setEditing(null)} className="px-4 py-2 rounded-lg border border-theme-divider text-theme-textSecondary hover:bg-theme-surfaceAlt transition">取消</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center px-4 py-2 rounded-lg bg-tech-accent text-white hover:bg-tech-accent/90 transition disabled:opacity-60">
                <Check className="w-4 h-4 mr-1" />{saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建弹窗 */}
      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setCreateOpen(false)}>
          <div className="bg-white dark:bg-tech-dark w-full max-w-md rounded-xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">新建用户</h3>
              <button onClick={() => !saving && setCreateOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名 *</label>
              <input className={inputCls} value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} placeholder="3-50 位字母/数字/下划线/中划线" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱 *</label>
              <input className={inputCls} value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码 *</label>
              <input type="password" className={inputCls} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="至少 6 位" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色</label>
              <select className={inputCls} value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                <option value="admin">管理员</option>
                <option value="editor">编辑</option>
                <option value="viewer">访客</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">姓</label>
                <input className={inputCls} value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名</label>
                <input className={inputCls} value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => !saving && setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-theme-divider text-theme-textSecondary hover:bg-theme-surfaceAlt transition">取消</button>
              <button onClick={handleCreate} disabled={saving} className="inline-flex items-center px-4 py-2 rounded-lg bg-tech-accent text-white hover:bg-tech-accent/90 transition disabled:opacity-60">
                <Check className="w-4 h-4 mr-1" />{saving ? '创建中…' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 活动记录弹窗 */}
      {activityUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setActivityUser(null)}>
          <div className="bg-white dark:bg-tech-dark w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">活动记录 - {activityUser.username}</h3>
              <button onClick={() => setActivityUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-white/10">
              {activityLoading && (
                <p className="py-8 text-center text-sm text-theme-textSecondary">加载中...</p>
              )}
              {!activityLoading && activityLogs.length === 0 && (
                <p className="py-8 text-center text-sm text-theme-textSecondary">暂无活动记录</p>
              )}
              {activityLogs.map((log) => (
                <div key={log.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{log.description || log.action}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(log.created_at)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <span>{log.action}</span>
                    {log.resource_type && <span>· {log.resource_type}</span>}
                    {log.ip_address && <span>· {log.ip_address}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
