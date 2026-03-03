export default function FallbackBanner({ message }: { message: string }) {
  return (
    <div className="bg-gray-50 border border-line-default rounded-lg px-4 py-3 mb-6 text-sm text-text-muted">
      {message}
    </div>
  );
}
