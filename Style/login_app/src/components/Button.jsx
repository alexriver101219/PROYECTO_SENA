import React from 'react'

function Button({ 
  type = "button", 
  label, 
  onClick, 
  className = "btn btn-primary", 
  disabled = false 
}) {
  return (
    <button 
      type={type} 
      className={className} 
      onClick={onClick} 
      disabled={disabled}
    >
      {label}
    </button>
  )
}

export default Button
