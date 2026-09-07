import React from 'react'
import { TemplateComponent } from '@/types/templates'
import { motion } from 'framer-motion'
import { HoverFX } from '@/components/motion'
import { grabMotionSettings } from '@/styles/motion-presets'

export const TeamGridPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const {title, subtitle, members = [], widthOption = 'full', backgroundColorOption = 'default'} = component.props
  const motionSettings = grabMotionSettings(component.props)
  const hover = motionSettings.hover
  const hoverEnabled = hover !== 'none'
  const hoverDuration = motionSettings.hoverDuration

  // 根据宽度选项设置容器类名
  const containerClass = `${widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'} ${backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'}`;

  return (
    <div className={containerClass}>
      <div className={`team-grid-preview p-8 rounded-xl ${backgroundColorOption === 'transparent' ? '' : 'bg-gradient-to-br from-color-background to-color-surface'}`}>
      {title && (
        <motion.div
          className="team-grid-header text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="team-grid-title text-4xl md:text-5xl font-bold mb-6 text-text-primary">{title}</h2>
          {subtitle && (
            <p className="team-grid-subtitle text-xl text-text-secondary w-full leading-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}

      <div className="team-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {members.map((member: any, index: number) => (
          <HoverFX
            key={index}
            hover={hover}
            duration={grabMotionSettings(component.props).hoverDuration}
            className={`team-member-card ${hoverEnabled ? "group/team-card " : ""}text-center bg-color-surface p-8 rounded-2xl shadow-lg border border-color-border`}
          >
            {/* 头像 */}
            <div className="team-member-avatar relative mb-6 mx-auto">
              <div className={`team-member-avatar-container w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-color-background to-color-surface flex items-center justify-center relative ${hoverEnabled ? 'group-hover/team-card:scale-105 transition-transform' : ''}`} style={hoverEnabled ? { transitionDuration: `${hoverDuration}s` } : undefined}>
                {member.avatar ? (
                  <img
                    key={`${member.avatar}-${index}`}
                    src={member.avatar}
                    alt={member.name}
                    className="team-member-avatar-image w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Team member avatar failed to load:', member.avatar)
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-text-tertiary text-5xl">👤</span>
                )}
              </div>
              {hoverEnabled && (
                <div
                  className="team-member-avatar-glow absolute inset-0 w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-primary to-accent opacity-0 group-hover/team-card:opacity-20 transition-opacity blur-lg"
                  style={{ transitionDuration: `${hoverDuration}s` }}
                ></div>
              )}
            </div>

            {/* 信息 */}
            <div className="team-member-info">
              <h3
                className={`team-member-name text-xl font-bold text-text-primary mb-2 ${hoverEnabled ? 'group-hover/team-card:text-primary transition-colors' : ''}`}
                style={hoverEnabled ? { transitionDuration: `${hoverDuration}s` } : undefined}
              >
                {member.name || '成员姓名'}
              </h3>
              <p className="team-member-role text-text-secondary font-semibold mb-4 text-sm uppercase tracking-wide">
                {member.role || '职位'}
              </p>
              <p className="team-member-bio text-text-secondary text-sm leading-relaxed">
                {member.bio || '个人简介'}
              </p>
            </div>

          </HoverFX>
        ))}
      </div>
    </div>
  </div>
  )
}

// 行动号召预览
