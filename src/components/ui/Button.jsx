import React, { forwardRef, useState } from 'react'

const VARIANTS = {
  primary: { bg: '#111', bgHov: '#333', color: '#fff', border: 'transparent' },
  ghost: { bg: 'transparent', bgHov: '#f3f3f3', color: '#444', border: '#e0e0e0' },
  danger: { bg: '#fff5f5', bgHov: '#ffe4e4', color: '#b91c1c', border: '#fecaca' },
  secondary: { bg: '#f5f5f5', bgHov: '#ebebeb', color: '#333', border: '#e0e0e0' },
}

const SIZES = {
  sm: { padding: '5px 11px', fontSize: '12px' },
  md: { padding: '7px 15px', fontSize: '13px' },
  lg: { padding: '9px 20px', fontSize: '14px' },
}

const Button = forwardRef(function Button({
  variant = 'primary',
  size = 'md',
  onClick,
  children,
  disabled = false,
  style = {},
  tabIndex,
  type = 'button',
  title,
  className,
  ...props
}, ref) {
  const [hovered, setHovered] = useState(false)
  const variantStyle = VARIANTS[variant] || VARIANTS.primary
  const sizeStyle = SIZES[size] || SIZES.md

  return (
    <button
      ref={ref}
      type={type}
      tabIndex={tabIndex}
      title={title}
      className={className}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: `1px solid ${variantStyle.border}`,
        borderRadius: 'var(--r-sm)',
        fontFamily: 'var(--font)',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background .12s, opacity .12s',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        background: hovered && !disabled ? variantStyle.bgHov : variantStyle.bg,
        color: variantStyle.color,
        letterSpacing: '-.1px',
        ...sizeStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button
