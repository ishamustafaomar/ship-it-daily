export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <img
      src="/favicon.png"
      alt=""
      aria-hidden="true"
      className={`${className} shrink-0 object-contain`}
    />
  );
}