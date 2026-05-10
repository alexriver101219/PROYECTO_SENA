import React from 'react'

function InputField({ id, label, type = "text", placeholder, value, onChange, required = false }) {
  return (
    <div className="input-group">
      <label htmlFor={id} className="form-label">{label}</label>
      <input
        id={id}
        type={type}
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  )
}

export default InputField
