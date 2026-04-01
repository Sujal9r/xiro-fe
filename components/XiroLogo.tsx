import Image from "next/image";

interface XiroLogoProps {
  size?: number;
  className?: string;
}

export default function XiroLogo({ size = 44, className = "" }: XiroLogoProps) {
  return (
    <Image
      src="/xiro.png"
      alt="Xiro logo"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
