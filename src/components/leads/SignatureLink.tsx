'use client'

export default function SignatureLink({ url }: { url: string }) {
  return (
    <input
      readOnly
      value={url}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-600"
      onClick={(e) => (e.target as HTMLInputElement).select()}
      dir="ltr"
    />
  )
}
