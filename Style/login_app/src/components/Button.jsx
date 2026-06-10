export default function Button({ type, label, className }) {
  return (
    <button type={type} className={className}>
      {label}
    </button>
  )
}

