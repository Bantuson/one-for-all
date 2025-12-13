import { cn } from '@/lib/utils'
import Image from 'next/image'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Image
        src="/images/oneforall-letterman.png"
        alt="One For All"
        width={990}
        height={247}
        priority
        className="logo-large block h-auto w-full max-w-[600px]"
        unoptimized
      />
    </div>
  )
}
