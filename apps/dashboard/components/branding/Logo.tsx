import { cn } from '@/lib/utils'
import Image from 'next/image'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Light theme logo */}
      <Image
        src="/images/oneforall-letterman.png?v=2"
        alt="One For All"
        width={990}
        height={247}
        priority
        className="logo-large block h-auto w-full dark:hidden"
        unoptimized
      />

      {/* Dark theme logo */}
      <Image
        src="/images/oneforall-letterman-dark.png?v=2"
        alt="One For All"
        width={990}
        height={247}
        priority
        className="logo-large hidden h-auto w-full dark:block"
        unoptimized
      />
    </div>
  )
}
