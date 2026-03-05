import Image from "next/image";
import logoImage from "../../public/images/logo.png";

interface LogoProps {
  size?: number; // in pixels
  className?: string;
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <Image
      src={logoImage}
      alt="Mofid Logo"
      width={size}
      height={size}
      className={className}
    />
  );
}