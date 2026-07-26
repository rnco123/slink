import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1 small:py-12" data-testid="account-page">
      <div className="mx-auto flex h-full max-w-5xl flex-1 flex-col bg-white px-6 md:px-8">
        <div className="grid grid-cols-1 gap-y-8 py-8 small:grid-cols-[240px_1fr] small:gap-x-12 small:gap-y-0 small:py-12">
          <div className="min-w-0">
            {customer && <AccountNav customer={customer} />}
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
        <div className="flex flex-col items-start gap-6 border-line py-8 small:flex-row small:items-end small:justify-between small:border-t small:gap-8 small:py-12">
          <div>
            <h3 className="mb-2 font-display text-xl text-evergreen-800">
              Got questions?
            </h3>
            <span className="text-sm text-ink-muted">
              You can find frequently asked questions and answers on our
              customer service page.
            </span>
          </div>
          <div>
            <UnderlineLink href="/customer-service">
              Customer Service
            </UnderlineLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
