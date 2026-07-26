import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="font-display text-2xl text-evergreen-800">
        Page not found
      </h1>
      <p className="text-sm text-ink-muted">
        The page you tried to access does not exist.
      </p>
      <Link className="flex gap-x-1 items-center group" href="/">
        <Text className="font-medium text-evergreen-700">Go to frontpage</Text>
        <ArrowUpRightMini className="text-evergreen-700 group-hover:rotate-45 ease-in-out duration-150" />
      </Link>
    </div>
  )
}
