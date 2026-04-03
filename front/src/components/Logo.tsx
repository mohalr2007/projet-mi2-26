import logoImage from "../../public/images/logo.png";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function Logo({ width = 100, height = 40, className = "" }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoImage.src}
      alt="Mofid Logo"
      width={width}
      height={height}
      className={`dark:brightness-125 dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all duration-300 ${className}`}
      style={{ width: `${width}px`, height: `${height}px`, objectFit: "contain" }}
    />
  );
}